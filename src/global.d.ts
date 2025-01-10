import { AssistantWindow } from '@salutejs/client';

export declare global {
    interface Window extends AssistantWindow {
        appInitialData: Record<string, any>;
        __ASSISTANT_CLIENT__?: {
            version: string;
            firstSmartAppDataMid?: string;
        };
    }

    interface Navigator {
        userAgentData: userAgentUIData
    }
}
