async function main() {
    const [_dev] = await ethers.getSigners();
    const dev = _dev.address;
    let baseNonce = ethers.provider.getTransactionCount(dev);
    let nonceOffset = 0;
    function getNonce() {
        return baseNonce.then((nonce) => (nonce + (nonceOffset++)));
    }
    console.log('nonce', await getNonce() );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
