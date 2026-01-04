// Helper utilities para manejo de tipos Prisma vs String

export function convertToString(value: any): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'object' && value.toString) {
    return value.toString();
  }
  return String(value);
}

export function convertToNumber(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  if (value === null || value === undefined) {
    return 0;
  }
  return Number(value) || 0;
}

export function isValidPrismaType(value: any): boolean {
  return value !== null && value !== undefined && typeof value === 'object';
}

// Helper específico para tipos de Prisma
export class PrismaTypeHandler {
  static handleStringField(value: any): string | null {
    if (!isValidPrismaType(value)) {
      return null;
    }
    return typeof value === 'string' ? value : String(value);
  }
  
  static handleNumberField(value: any): number {
    if (!isValidPrismaType(value)) {
      return 0;
    }
    return typeof value === 'number' ? value : Number(value);
  }
}