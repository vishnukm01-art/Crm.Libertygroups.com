/** Email delivery job payload */
export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
}

/** MT5 deposit operation job payload */
export interface Mt5DepositJobData {
  type: "deposit";
  mt5Login: string;
  amount: number;
  comment: string;
  transactionId: string;
}

/** MT5 withdrawal operation job payload */
export interface Mt5WithdrawJobData {
  type: "withdraw";
  mt5Login: string;
  amount: number;
  comment: string;
  transactionId: string;
}

export type Mt5JobData = Mt5DepositJobData | Mt5WithdrawJobData;

/** Audio processing job payload */
export interface AudioProcessingJobData {
  interactionId: string;
  audioUrl: string;
}

/** Webhook delivery job payload */
export interface WebhookDeliveryJobData {
  webhookId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
}
