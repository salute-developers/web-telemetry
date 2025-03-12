// WICG Spec: https://wicg.github.io/ua-client-hints

declare interface Navigator extends NavigatorUA {}
declare interface WorkerNavigator extends NavigatorUA {}

// https://wicg.github.io/ua-client-hints/#navigatorua
declare interface NavigatorUA {
    readonly userAgentData?: NavigatorUAData;
}

// https://wicg.github.io/ua-client-hints/#dictdef-navigatoruabrandversion
interface NavigatorUABrandVersion {
    readonly brand: string;
    readonly version: string;
}

// https://wicg.github.io/ua-client-hints/#dictdef-uadatavalues
interface UADataValues {
    readonly architecture?: string;
    readonly bitness?: string;
    readonly brands?: NavigatorUABrandVersion[];
    readonly formFactors?: string[];
    readonly fullVersionList?: NavigatorUABrandVersion[];
    readonly model?: string;
    readonly mobile?: boolean;
    readonly platform?: string;
    readonly platformVersion?: string;
    /**
     * @deprecated in favor of {@link fullVersionList}
     */
    readonly uaFullVersion?: string;
    readonly wow64?: boolean;
}

// https://wicg.github.io/ua-client-hints/#dictdef-ualowentropyjson
interface UALowEntropyJSON {
    readonly brands: NavigatorUABrandVersion[];
    readonly mobile: boolean;
    readonly platform: string;
}

// https://wicg.github.io/ua-client-hints/#navigatoruadata
interface NavigatorUAData extends UALowEntropyJSON {
    getHighEntropyValues(hints: string[]): Promise<UADataValues>;
    toJSON(): UALowEntropyJSON;
}
