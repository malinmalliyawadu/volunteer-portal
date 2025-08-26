import createsend from "createsend-node";

interface EmailData {
  firstName: string;
  link: string;
  [key: string]: string;
}

interface SendEmailParams {
  to: string;
  firstName: string;
  migrationLink: string;
}

interface ShiftCancellationEmailData {
  managerName: string;
  volunteerName: string;
  volunteerEmail: string;
  shiftName: string;
  shiftDate: string;
  shiftTime: string;
  location: string;
  cancellationTime: string;
  remainingVolunteers: string;
  shiftCapacity: string;
}

interface SendShiftCancellationParams {
  to: string;
  managerName: string;
  volunteerName: string;
  volunteerEmail: string;
  shiftName: string;
  shiftDate: string;
  shiftTime: string;
  location: string;
  cancellationTime: string;
  remainingVolunteers: number;
  shiftCapacity: number;
}

interface CampaignMonitorAPI {
  transactional: {
    sendSmartEmail: (
      details: unknown,
      callback: (err: Error | null, res: unknown) => void
    ) => void;
  };
}

class EmailService {
  private api: CampaignMonitorAPI;
  private migrationSmartEmailID: string;
  private shiftCancellationSmartEmailID: string;

  constructor() {
    const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY;

    if (!apiKey) {
      throw new Error("CAMPAIGN_MONITOR_API_KEY is not configured");
    }

    const auth = { apiKey };
    this.api = new createsend(auth) as CampaignMonitorAPI;

    // Smart email ID for migration invites
    const migrationEmailId = process.env.CAMPAIGN_MONITOR_MIGRATION_EMAIL_ID;
    if (!migrationEmailId) {
      throw new Error("CAMPAIGN_MONITOR_MIGRATION_EMAIL_ID is not configured");
    }
    this.migrationSmartEmailID = migrationEmailId;

    // Smart email ID for shift cancellation notifications
    const cancellationEmailId = process.env.CAMPAIGN_MONITOR_SHIFT_CANCELLATION_EMAIL_ID;
    if (!cancellationEmailId) {
      throw new Error("CAMPAIGN_MONITOR_SHIFT_CANCELLATION_EMAIL_ID is not configured");
    }
    this.shiftCancellationSmartEmailID = cancellationEmailId;
  }

  async sendMigrationInvite({
    to,
    firstName,
    migrationLink,
  }: SendEmailParams): Promise<void> {
    const details = {
      smartEmailID: this.migrationSmartEmailID,
      to: `${firstName} <${to}>`,
      data: {
        firstName,
        link: migrationLink,
      } as EmailData,
    };

    return new Promise<void>((resolve, reject) => {
      this.api.transactional.sendSmartEmail(details, (err: Error | null) => {
        if (err) {
          console.error("Error sending migration invite email:", err);
          reject(err);
        } else {
          console.log("Migration invite email sent successfully to:", to);
          resolve();
        }
      });
    });
  }

  async sendShiftCancellationNotification(params: SendShiftCancellationParams): Promise<void> {
    const details = {
      smartEmailID: this.shiftCancellationSmartEmailID,
      to: `${params.managerName} <${params.to}>`,
      data: {
        managerName: params.managerName,
        volunteerName: params.volunteerName,
        volunteerEmail: params.volunteerEmail,
        shiftName: params.shiftName,
        shiftDate: params.shiftDate,
        shiftTime: params.shiftTime,
        location: params.location,
        cancellationTime: params.cancellationTime,
        remainingVolunteers: params.remainingVolunteers.toString(),
        shiftCapacity: params.shiftCapacity.toString(),
      } as ShiftCancellationEmailData,
    };

    return new Promise<void>((resolve, reject) => {
      this.api.transactional.sendSmartEmail(details, (err: Error | null) => {
        if (err) {
          console.error("Error sending shift cancellation email:", err);
          reject(err);
        } else {
          console.log("Shift cancellation email sent successfully to:", params.to);
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
}

export type { SendEmailParams, SendShiftCancellationParams, ShiftCancellationEmailData };
