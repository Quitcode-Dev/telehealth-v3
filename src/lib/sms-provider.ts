export type SendSmsOtpParams = {
  phoneNumber: string;
  otpCode: string;
};

export interface SmsProvider {
  sendOtp(params: SendSmsOtpParams): Promise<void>;
}

class MockSmsProvider implements SmsProvider {
  async sendOtp({ phoneNumber, otpCode }: SendSmsOtpParams) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mock-sms] OTP for ${phoneNumber}: ${otpCode}`);
    }
  }
}

const smsProvider: SmsProvider = new MockSmsProvider();

export function getSmsProvider() {
  return smsProvider;
}
