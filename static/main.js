document.addEventListener('DOMContentLoaded', function () {
    const userId = new URLSearchParams(window.location.search).get('user_id');
    const loginDiscordButton = document.getElementById('loginDiscord');
    const loginWalletButton = document.getElementById('loginWallet');
    const logoutDiscordButton = document.getElementById('logoutDiscord');
    const oauthSuccess = new URLSearchParams(window.location.search).get('oauth_success') === 'True';

    if (logoutDiscordButton) {
        logoutDiscordButton.addEventListener('click', logoutFromDiscord);
    }

    if (loginDiscordButton) {
        loginDiscordButton.addEventListener('click', () => {
            const clientId = '1195885802786394154';
            const redirectUri = 'https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/callback';
            window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
        });
    }

    if (oauthSuccess) {
        loginDiscordButton.style.display = 'none';
        logoutDiscordButton.style.display = 'block';
        loginWalletButton.style.display = 'block';
    }

    if (loginWalletButton) {
        loginWalletButton.addEventListener('click', () => {
            connectToDogeLabsWallet(userId);
        });
    }

    window.addEventListener('message', async (event) => {
        if (!event.origin.includes("doge-labs.com")) return;

        const { signature, address } = event.data;
        if (!signature || !address) return;

        console.log("Signature:", signature);
        console.log("Wallet address:", address);

        try {
            await verifySignature(signature, userId);
            await getDoginals(userId, address);
        } catch (e) {
            console.error("Post-signature verification error:", e.message);
        }
    });
});

function logoutFromDiscord() {
    sessionStorage.removeItem('discordToken');
    document.getElementById('loginDiscord').style.display = 'block';
    document.getElementById('loginWallet').style.display = 'none';
    document.getElementById('logoutDiscord').style.display = 'none';
    alert('You have been logged out from Discord.');
}

function connectToDogeLabsWallet(userId) {
    const msg = "Sign to Prove Ownership";
    const popup = window.open(
        `https://doge-labs.com/connect?message=${encodeURIComponent(msg)}`,
        '_blank',
        'width=480,height=640'
    );

    if (!popup) {
        alert("Please enable pop-ups for this site.");
    }
}

async function verifySignature(signature, userId) {
    const res = await fetch('https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/verify_signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, user_id: userId })
    });

    if (!res.ok) throw new Error("Failed to verify signature");
    const data = await res.json();
    console.log("Signature verified:", data);
}

async function getDoginals(userId, address, cursor = 0, all = []) {
    const res = await fetch(`https://api.doge-labs.com/wallet/${address}/inscriptions?cursor=${cursor}`);
    const result = await res.json();
    const list = result.list || [];

    if (cursor === 0 && list.length === 0) {
        return alert("No Doginal Dogs found in your wallet.");
    }

    all = all.concat(list);

    if (list.length === 20) {
        return getDoginals(userId, address, cursor + 20, all);
    }

    const payload = all.map(i => ({
        user_id: userId,
        inscriptionId: i.inscriptionId,
        inscriptionNumber: i.inscriptionNumber,
        address: i.address
    }));

    const post = await fetch('https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/verify_holder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optimized_data: payload, user_id: userId })
    });

    const resultPost = await post.json();
    console.log("Holder Verification Response:", resultPost);

    alert("Holder verification complete.");
}
