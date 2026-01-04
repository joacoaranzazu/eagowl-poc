import { AuthenticatedSocket } from '../server';
import { redisCache } from '@/database/redis';
import { prisma } from '@/database/connection';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
  locationSource?: string;
}

export class LocationService {
  private io: any;

  constructor(io: any) {
    this.io = io;
  }

  async handleUpdate(socket: AuthenticatedSocket, data: LocationData): Promise<void> {
    try {
      const {
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        locationSource = 'gps'
      } = data;

      // Validate coordinates
      if (!latitude || !longitude) {
        socket.emit('error', { message: 'Invalid coordinates' });
        return;
      }

      // Save to database
      const location = await prisma.location.create({
        data: {
          userId: socket.userId,
          latitude,
          longitude,
          accuracy: accuracy ? new String(accuracy) : null,
          altitude: altitude ? new String(altitude) : null,
          speed: speed ? new String(speed) : null,
          heading: heading || null,
          locationSource,
          timestamp: new Date()
        }
      });

      // Cache latest location
      await redisCache.setUserLocation(socket.userId, {
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        locationSource,
        timestamp: location.timestamp
      }, 300); // 5 minutes

      // Get user groups to notify
      const userGroups = await prisma.userGroup.findMany({
        where: { userId: socket.userId },
        include: { group: true }
      });

      // Notify group members
      const locationUpdate = {
        userId: socket.userId,
        username: socket.user.username,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        timestamp: location.timestamp.toISOString()
      };

      for (const userGroup of userGroups) {
        // Only notify groups that have location tracking enabled
        if (userGroup.group.type === 'DISPATCH' || userGroup.group.type === 'EMERGENCY') {
          this.io.to(`group:${userGroup.group.id}`).emit('location_update', locationUpdate);
        }
      }

      // Update user device last seen
      await prisma.device.updateMany({
        where: { userId: socket.userId },
        data: { lastSeen: new Date() }
      });

      console.log(`📍 Location updated for user ${socket.userId}: ${latitude}, ${longitude}`);

    } catch (error) {
      console.error('Location update error:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  }

  async handleRequest(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { userIds, groupId, timeRange } = data;

      let locations;

      if (userId && Array.isArray(userIds)) {
        // Get specific users' locations
        locations = await this.getUsersLocations(userIds, timeRange);
      } else if (groupId) {
        // Get all users in a group
        locations = await this.getGroupLocations(groupId, timeRange);
      } else {
        socket.emit('error', { message: 'Invalid request parameters' });
        return;
      }

      socket.emit('location_response', {
        requestId: data.requestId,
        locations,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Location request error:', error);
      socket.emit('error', { message: 'Failed to get location data' });
    }
  }

  private async getUsersLocations(userIds: string[], timeRange?: any): Promise<any[]> {
    const locations: any[] = [];

    for (const userId of userIds) {
      // Try cache first
      const cachedLocation = await redisCache.getUserLocation(userId);
      
      if (cachedLocation) {
        locations.push({
          userId,
          ...cachedLocation,
          fromCache: true
        });
        continue;
      }

      // Get from database
      const latestLocation = await prisma.location.findFirst({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        select: {
          latitude: true,
          longitude: true,
          accuracy: true,
          altitude: true,
          speed: true,
          heading: true,
          timestamp: true
        }
      });

      if (latestLocation) {
        locations.push({
          userId,
          latitude: latestLocation.latitude,
          longitude: latestLocation.longitude,
          accuracy: latestLocation.accuracy,
          altitude: latestLocation.altitude,
          speed: latestLocation.speed,
          heading: latestLocation.heading,
          timestamp: latestLocation.timestamp.toISOString(),
          fromCache: false
        });
      }
    }

    return locations;
  }

  private async getGroupLocations(groupId: string, timeRange?: any): Promise<any[]> {
    const userGroups = await prisma.userGroup.findMany({
      where: { groupId },
      select: { userId: true }
    });

    const userIds = userGroups.map(ug => ug.userId);
    return this.getUsersLocations(userIds, timeRange);
  }

  async getLocationHistory(userId: string, limit: number = 100, offset: number = 0): Promise<any[]> {
    const locations = await prisma.location.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
      select: {
        latitude: true,
        longitude: true,
        accuracy: true,
        altitude: true,
        speed: true,
        heading: true,
        timestamp: true,
        locationSource: true
      }
    });

    return locations.map(location => ({
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: location.altitude,
      speed: location.speed,
      heading: location.heading,
      timestamp: location.timestamp.toISOString(),
      locationSource: location.locationSource
    }));
  }

  async getLocationsInArea(
    north: number,
    south: number,
    east: number,
    west: number,
    timeRange?: { start: string; end: string }
  ): Promise<any[]> {
    const whereClause: any = {
      latitude: { gte: south, lte: north },
      longitude: { gte: west, lte: east }
    };

    if (timeRange) {
      whereClause.timestamp = {
        gte: new Date(timeRange.start),
        lte: new Date(timeRange.end)
      };
    }

    const locations = await prisma.location.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 1000,
      include: {
        user: {
          select: { id: true, username: true, firstName: true, lastName: true }
        }
      }
    });

    return locations.map(location => ({
      userId: location.userId,
      username: location.user.username,
      firstName: location.user.firstName,
      lastName: location.user.lastName,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp.toISOString()
    }));
  }

  async clearLocationHistory(userId: string, beforeDate?: string): Promise<number> {
    const whereClause: any = { userId };

    if (beforeDate) {
      whereClause.timestamp = { lt: new Date(beforeDate) };
    } else {
      // Default to 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      whereClause.timestamp = { lt: thirtyDaysAgo };
    }

    const result = await prisma.location.deleteMany({ where: whereClause });
    return result.count;
  }
}