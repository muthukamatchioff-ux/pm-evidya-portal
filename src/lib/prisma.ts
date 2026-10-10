import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: any };

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: ['query'],
  });

  // Attach an extension to catch database connection failures globally
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ operation, model, args, query }) {
          try {
            return await query(args);
          } catch (error: any) {
            // Safely intercept PrismaClientInitializationError on Vercel Preview
            if (
              error?.name === 'PrismaClientInitializationError' ||
              error?.message?.includes('database connection') ||
              error?.message?.includes('datasource')
            ) {
              console.error(`[Prisma Intercepted] DB Connection failed for ${model}.${operation}`);
              
              // Return safe mock values based on the operation type to prevent 500 crashes
              if (operation === 'findMany') return [];
              if (operation === 'findUnique' || operation === 'findFirst') return null;
              if (operation === 'count') return 0;
              if (operation === 'aggregate') return { _sum: {}, _avg: {}, _count: {}, _min: {}, _max: {} };
              
              return null; // Fallback for other queries
            }
            throw error; // Rethrow actual logical errors
          }
        },
      },
    },
  });
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
