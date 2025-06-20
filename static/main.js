document.addEventListener('DOMContentLoaded', function () {
    const userId = document.getElementById('loginWallet')?.dataset?.userId;
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
        if (event.origin !== 'https://doge-labs.com') return;
        const { signature, address } = event.data;
        if (signature && address) {
            await verifySignature(signature, userId);
            await getDoginals(userId, address);
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
    const popup = window.open(
        `https://doge-labs.com/connect?message=${encodeURIComponent("Sign to Prove Ownership")}`,
        '_blank',
        'width=480,height=640'
    );

    if (!popup) {
        alert("Please allow pop-ups and try again.");
    }
}

async function verifySignature(signature, userId) {
    try {
        const response = await fetch('https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/verify_signature', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signature, user_id: userId })
        });

        if (!response.ok) throw new Error("Signature verification failed.");
        const data = await response.json();
        console.log("Signature verified:", data);
    } catch (err) {
        console.error("Verification error:", err.message);
        alert("Verification failed.");
    }
}

async function getDoginals(userId, address, cursor = 0, all = []) {
    try {
        const res = await fetch(`https://api.doge-labs.com/wallet/${address}/inscriptions?cursor=${cursor}`);
        const result = await res.json();
        const inscriptions = result.list || [];

        if (cursor === 0 && inscriptions.length === 0) {
            return alert("No Doginal Dogs found in your wallet.");
        }

        all = all.concat(inscriptions);

        if (inscriptions.length === 20) {
            return getDoginals(userId, address, cursor + 20, all);
        }

        const payload = all.map(i => ({
            user_id: userId,
            inscriptionId: i.inscriptionId,
            inscriptionNumber: i.inscriptionNumber,
            address: i.address
        }));

        const postRes = await fetch('https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/verify_holder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ optimized_data: payload, user_id: userId })
        });

        const data = await postRes.json();
        console.log("Verification Result:", data);
        alert("Holder verification complete.");
    } catch (err) {
        console.error("Error fetching Doginals:", err.message);
    }
}
