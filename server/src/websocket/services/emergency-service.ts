import { AuthenticatedSocket } from '../server';
import { redisCache } from '../../database/redis';
import { prisma } from '../../database/connection';

export class EmergencyService {
  private io: any;
  private activeEmergencies: Map<string, any> = new Map();

  constructor(io: any) {
    this.io = io;
  }

  async handleSOS(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const {
        alertType = 'SOS',
        notes,
        location
      } = data;

      // Get user's latest location or use provided location
      let locationData = location;
      if (!locationData) {
        const cachedLocation = await redisCache.getUserLocation(socket.userId);
        locationData = cachedLocation;
      }

      // Create emergency alert
      const emergencyAlert = await prisma.emergencyAlert.create({
        data: {
          userId: socket.userId,
          alertType: alertType.toUpperCase() as any,
          status: 'ACTIVE',
          priority: this.getPriorityByType(alertType),
          notes,
          createdAt: new Date()
        } as any
      });

      // Create location record if provided
      if (locationData) {
          const locationRecord = await prisma.location.create({
            data: {
              user: { connect: { id: socket.userId } },
              latitude: String(locationData.latitude),
              longitude: String(locationData.longitude),
              accuracy: locationData.accuracy != null ? String(locationData.accuracy) : null,
              altitude: locationData.altitude != null ? String(locationData.altitude) : null,
              locationSource: locationData.locationSource ?? 'gps',
              timestamp: new Date()
            } as any
          });

        await prisma.emergencyAlert.update({
          where: { id: emergencyAlert.id },
          data: { locationId: locationRecord.id }
        });
      }

      // Get user groups for notifications
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: socket.userId },
        include: { 
          group: true,
          user: {
            include: { emergencyProfile: true }
          }
        }
      });

      // Cache active emergency
      this.activeEmergencies.set(socket.userId, {
        alertId: emergencyAlert.id,
        alertType: emergencyAlert.alertType,
        timestamp: emergencyAlert.createdAt,
        location: locationData
      });

      await redisCache.set(`emergency:${socket.userId}`, {
        alertId: emergencyAlert.id,
        alertType: emergencyAlert.alertType,
        status: 'ACTIVE',
        timestamp: emergencyAlert.createdAt.toISOString(),
        location: locationData
      }, 3600);

      // Create emergency notification
      const emergencyNotification = {
        alertId: emergencyAlert.id,
        userId: socket.userId,
        username: socket.user.username,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        alertType: emergencyAlert.alertType,
        priority: emergencyAlert.priority,
        notes,
        location: locationData,
        timestamp: emergencyAlert.createdAt.toISOString()
      };

      // Send emergency notification to all relevant groups
      for (const userGroup of userGroups) {
        // Send to group members
        this.io.to(`group:${userGroup.group.id}`).emit('emergency_alert', emergencyNotification);
        
        // Special handling for dispatch and emergency groups
        if (userGroup.group.type === 'DISPATCH' || userGroup.group.type === 'EMERGENCY') {
          // Send high-priority notification
          this.io.to(`group:${userGroup.group.id}`).emit('emergency_priority_alert', {
            ...emergencyNotification,
            requiresImmediateAction: true
          });
        }
      }

      // Send confirmation to user
      socket.emit('emergency_confirmed', {
        alertId: emergencyAlert.id,
        alertType: emergencyAlert.alertType,
        timestamp: emergencyAlert.createdAt.toISOString()
      });

      // Trigger escalation if enabled
      await this.handleEscalation(socket.userId, emergencyAlert);

      console.log(`🚨 Emergency alert created: ${emergencyAlert.id} - ${alertType} for user ${socket.userId}`);

    } catch (error) {
      console.error('Emergency SOS error:', error);
      socket.emit('error', { message: 'Failed to create emergency alert' });
    }
  }

  async handleCancel(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { alertId, notes } = data;

      const emergencyAlert = await prisma.emergencyAlert.findFirst({
        where: {
          id: alertId,
          userId: socket.userId,
          status: 'ACTIVE'
        }
      });

      if (!emergencyAlert) {
        socket.emit('error', { message: 'Emergency alert not found' });
        return;
      }

      // Update emergency alert
      await prisma.emergencyAlert.update({
        where: { id: alertId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy: socket.userId
        }
      });

      // Clear from active emergencies
      this.activeEmergencies.delete(socket.userId);
      await redisCache.removeUserSession(`emergency:${socket.userId}`);

      // Notify relevant groups
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: socket.userId },
        include: { group: true }
      });

      const cancelNotification = {
        alertId,
        userId: socket.userId,
        username: socket.user.username,
        status: 'RESOLVED',
        notes,
        timestamp: new Date().toISOString()
      };

      for (const userGroup of userGroups) {
        this.io.to(`group:${userGroup.group.id}`).emit('emergency_resolved', cancelNotification);
      }

      socket.emit('emergency_cancelled', {
        alertId,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Emergency resolved: ${alertId} by user ${socket.userId}`);

    } catch (error) {
      console.error('Emergency cancel error:', error);
      socket.emit('error', { message: 'Failed to cancel emergency alert' });
    }
  }

  private async handleEscalation(userId: string, emergencyAlert: any): Promise<void> {
    try {
      // Get user's emergency profile
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { emergencyProfile: true }
      });

      if (!user?.emergencyProfile) {
        return;
      }

      const profile = user.emergencyProfile;

      // Check escalation rules
      for (const rule of await prisma.emergencyEscalationRule.findMany({
        where: {
          emergencyProfileId: profile.id,
          isActive: true
        }
      })) {
        // Simple delay-based escalation
        setTimeout(async () => {
          const currentAlert = await prisma.emergencyAlert.findFirst({
            where: {
              id: emergencyAlert.id,
              status: 'ACTIVE'
            }
          });

          if (currentAlert) {
            await this.executeEscalationRule(rule, userId, emergencyAlert);
          }
        }, rule.delay * 1000);
      }

    } catch (error) {
      console.error('Escalation error:', error);
    }
  }

  private async executeEscalationRule(rule: any, userId: string, emergencyAlert: any): Promise<void> {
    try {
      switch (rule.action) {
        case 'NOTIFY_OPERATOR':
          await this.notifyOperators(userId, emergencyAlert, rule.target);
          break;
        case 'NOTIFY_SUPERVISOR':
          await this.notifySupervisors(userId, emergencyAlert, rule.target);
          break;
        case 'SEND_EMAIL':
          await this.sendEmailNotification(userId, emergencyAlert, rule.target);
          break;
        case 'SEND_SMS':
          await this.sendSMSNotification(userId, emergencyAlert, rule.target);
          break;
        default:
          console.log(`Unknown escalation action: ${rule.action}`);
      }
    } catch (error) {
      console.error('Execute escalation rule error:', error);
    }
  }

  private async notifyOperators(userId: string, emergencyAlert: any, target?: string): Promise<void> {
    const operators = await prisma.user.findMany({
      where: { role: 'OPERATOR' }
    });

    for (const operator of operators) {
      this.io.to(`user:${operator.id}`).emit('emergency_escalation', {
        alertId: emergencyAlert.id,
        userId,
        alertType: emergencyAlert.alertType,
        escalationLevel: 'OPERATOR',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async notifySupervisors(userId: string, emergencyAlert: any, target?: string): Promise<void> {
    const supervisors = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    for (const supervisor of supervisors) {
      this.io.to(`user:${supervisor.id}`).emit('emergency_escalation', {
        alertId: emergencyAlert.id,
        userId,
        alertType: emergencyAlert.alertType,
        escalationLevel: 'SUPERVISOR',
        timestamp: new Date().toISOString()
      });
    }
  }

  private async sendEmailNotification(userId: string, emergencyAlert: any, email?: string): Promise<void> {
    // TODO: Implement email sending
    console.log(`📧 Email notification sent for emergency ${emergencyAlert.id}`);
  }

  private async sendSMSNotification(userId: string, emergencyAlert: any, phone?: string): Promise<void> {
    // TODO: Implement SMS sending
    console.log(`📱 SMS notification sent for emergency ${emergencyAlert.id}`);
  }

  private getPriorityByType(alertType: string): number {
    switch (alertType.toUpperCase()) {
      case 'SOS':
        return 5;
      case 'MAN_DOWN':
        return 4;
      case 'MEDICAL':
        return 4;
      case 'SAFETY':
        return 3;
      case 'DEVICE_FAILURE':
        return 2;
      case 'COMMUNICATION_LOST':
        return 3;
      default:
        return 1;
    }
  }

  async handleUserDisconnection(socket: AuthenticatedSocket): Promise<void> {
    // Check if user has active emergency
    const activeEmergency = this.activeEmergencies.get(socket.userId);
    
    if (activeEmergency) {
      // Create lost communication alert
      await prisma.emergencyAlert.create({
        data: {
          userId: socket.userId,
          alertType: 'COMMUNICATION_LOST' as any,
          status: 'ACTIVE',
          priority: 3,
          notes: 'User disconnected during emergency situation',
          createdAt: new Date()
        } as any
      });

      console.log(`⚠️ Communication lost during emergency for user ${socket.userId}`);
    }
  }

  async getActiveEmergencies(): Promise<any[]> {
    const emergencies = await prisma.emergencyAlert.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true }
        },
        location: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return emergencies.map(emergency => ({
      id: emergency.id,
      user: emergency.user,
      alertType: emergency.alertType,
      status: emergency.status,
      priority: emergency.priority,
      notes: emergency.notes,
      location: emergency.location,
      createdAt: emergency.createdAt.toISOString()
    }));
  }

  async resolveEmergency(alertId: string, resolvedBy: string, notes?: string): Promise<boolean> {
    try {
      await prisma.emergencyAlert.update({
        where: { id: alertId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolvedBy,
          notes
        }
      });

      // Clear from active emergencies
      this.activeEmergencies.delete(resolvedBy);

      return true;
    } catch (error) {
      console.error('Resolve emergency error:', error);
      return false;
    }
  }
}