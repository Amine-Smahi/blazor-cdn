function initializeAssemblyLoader(serverAppUrl, bundleServerUrl, appName) {
    let blobUrls = new Map();

    async function initializeBundle() {
        const [manifestResponse, bundleResponse] = await Promise.all([
            fetch(`${bundleServerUrl}/dotnet-bundle.manifest.json`),
            fetch(`${bundleServerUrl}/dotnet-bundle.wasm`)
        ]);
        
        const bundleManifest = await manifestResponse.json();
        const bundleCache = await bundleResponse.arrayBuffer();
        
        for (const [filename, fileInfo] of Object.entries(bundleManifest)) {
            const fileData = bundleCache.slice(fileInfo.start, fileInfo.end);
            const blob = new Blob([fileData], { type: 'application/wasm' });
            const blobUrl = URL.createObjectURL(blob);
            blobUrls.set(filename, blobUrl);
        }
    }

    initializeBundle().then(() => {
        Blazor.start({
            loadBootResource: function (type, name, defaultUri, integrity) {
                if (name.startsWith(appName)) {
                    return `${serverAppUrl}/app/${name}`;
                }
                
                if (blobUrls.has(name)) {
                    return blobUrls.get(name);
                }
                
                return `${bundleServerUrl}/${name}`;
            }
        });
    });

    window.addEventListener('beforeunload', () => {
        blobUrls.forEach(url => URL.revokeObjectURL(url));
    });
}
