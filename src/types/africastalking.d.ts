declare module "africastalking" {
  interface Credentials {
    apiKey: string;
    username: string;
    format?: "json" | "xml";
  }

  interface SendOptions {
    to: string | string[];
    message: string;
    from?: string;
    senderId?: string;
    enqueue?: boolean;
  }

  interface SendResponse {
    SMSMessageData?: {
      Message?: string;
      Recipients?: Array<Record<string, unknown>>;
    };
  }

  export interface AfricasTalkingClient {
    SMS: {
      send(options: SendOptions): Promise<SendResponse>;
    };
  }

  function AfricasTalking(credentials: Credentials): AfricasTalkingClient;
  export default AfricasTalking;
}
