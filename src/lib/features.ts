import "server-only";
import { prisma } from "./prisma";

export type Features = {
  pos: boolean;
  creditNotes: boolean;
  chatter: boolean;
  reports: boolean;
  dashboard: boolean;
};

export async function getFeatures(): Promise<Features> {
  const setting = await prisma.setting.findUnique({
    where: { id: "default" },
    select: {
      enablePos: true,
      enableCreditNotes: true,
      enableChatter: true,
      enableReports: true,
      enableDashboard: true,
    },
  });
  return {
    pos: setting?.enablePos ?? false,
    creditNotes: setting?.enableCreditNotes ?? true,
    chatter: setting?.enableChatter ?? true,
    reports: setting?.enableReports ?? true,
    dashboard: setting?.enableDashboard ?? true,
  };
}
