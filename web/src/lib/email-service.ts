import createsend from 'createsend-node';

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

interface CampaignMonitorAPI {
  transactional: {
    sendSmartEmail: (details: unknown, callback: (err: Error | null, res: unknown) => void) => void;
  };
}

class EmailService {
  private api: CampaignMonitorAPI;
  private smartEmailID: string;

  constructor() {
    const apiKey = process.env.CAMPAIGN_MONITOR_API_KEY;
    
    if (!apiKey) {
      throw new Error('CAMPAIGN_MONITOR_API_KEY is not configured');
    }

    const auth = { apiKey };
    this.api = new createsend(auth) as CampaignMonitorAPI;
    
    // Smart email ID for migration invites
    this.smartEmailID = process.env.CAMPAIGN_MONITOR_MIGRATION_EMAIL_ID;
    if (!this.smartEmailID) {
      throw new Error('CAMPAIGN_MONITOR_MIGRATION_EMAIL_ID is not configured');
    }
  }

  async sendMigrationInvite({ to, firstName, migrationLink }: SendEmailParams): Promise<void> {
    const details = {
      smartEmailID: this.smartEmailID,
      to: `${firstName} <${to}>`,
      data: {
        firstName,
        link: migrationLink
      } as EmailData
    };

    return new Promise<void>((resolve, reject) => {
      this.api.transactional.sendSmartEmail(details, (err: Error | null, res: unknown) => {
        if (err) {
          console.error('Error sending migration invite email:', err);
          reject(err);
        } else {
          console.log('Migration invite email sent successfully to:', to);
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

export type { SendEmailParams };