export function stringifyCircularObj(obj: any) {
    const cache: Record<any, any>[] = [];
    const str = JSON.stringify(obj, (_key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.includes(value)) {
                return;
            }
            cache.push(value);
        }

        return value;
    });

    return str;
}
