document.addEventListener('DOMContentLoaded', function() {
    const userId = new URLSearchParams(window.location.search).get('user_id');
    const clientId = '1195885802786394154';
    const redirectUri = 'https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/callback';
    const oauthSuccess = new URLSearchParams(window.location.search).get('oauth_success') === 'True';

    const loginDiscordButton = document.getElementById('loginDiscord');
    const loginWalletButton = document.getElementById('loginWallet');
    const logoutDiscordButton = document.getElementById('logoutDiscord');

    if (logoutDiscordButton) {
        logoutDiscordButton.addEventListener('click', logoutFromDiscord);
    }

    if (loginDiscordButton) {
        loginDiscordButton.addEventListener('click', function() {
            window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
        });
    }

    if (oauthSuccess) {
        loginDiscordButton.style.display = 'none';
        logoutDiscordButton.style.display = 'block';
        loginWalletButton.style.display = 'block';
    }

    if (loginWalletButton) {
        loginWalletButton.addEventListener('click', function() {
            connectToDogeLabsWallet(userId);
        });
    }

    window.addEventListener('message', async (event) => {
        if (!event.origin.includes("doge-labs.com")) return;

        const { signature, address } = event.data || {};
        if (!signature || !address) return;

        console.log("✅ Valid message from Doge Labs:", { signature, address });

        try {
            await verifySignature(signature, userId);
            await getDoginals(userId, address);
        } catch (e) {
            console.error("🔴 Post-signature verification error:", e.message);
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
    const message = "Sign to verify your wallet for Doginal Dogs access";
    const popup = window.open(
        `https://doge-labs.com/connect?message=${encodeURIComponent(message)}`,
        '_blank',
        'width=480,height=640'
    );

    if (!popup) {
        alert("Please enable pop-ups for this site.");
    }
}

async function verifySignature(signature, userId) {
    const response = await fetch('https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/verify_signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, user_id: userId })
    });

    if (!response.ok) throw new Error("Failed to verify signature");

    const data = await response.json();
    console.log("✅ Signature verified:", data);
}

async function getDoginals(userId, address, cursor = 0, allInscriptions = []) {
    try {
        const res = await fetch(`https://api.doge-labs.com/wallet/${address}/inscriptions?cursor=${cursor}`);
        const result = await res.json();
        const inscriptions = result.list || [];

        if (cursor === 0 && inscriptions.length === 0) {
            return alert("No Doginal Dogs found in your wallet.");
        }

        allInscriptions = allInscriptions.concat(inscriptions);

        if (inscriptions.length === 20) {
            return getDoginals(userId, address, cursor + 20, allInscriptions);
        }

        const payload = allInscriptions.map(inscription => ({
            user_id: userId,
            inscriptionId: inscription.inscriptionId,
            inscriptionNumber: inscription.inscriptionNumber,
            address: inscription.address
        }));

        const postRes = await fetch('https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/verify_holder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ optimized_data: payload, user_id: userId })
        });

        const data = await postRes.json();

        let alertShown = false;
        let firstError = "";

        data.forEach(response => {
            if (!alertShown) {
                if (response.message) {
                    alert(response.message);
                    alertShown = true;
                } else if (response.error && !firstError) {
                    firstError = response.error;
                }
            }
        });

        if (!alertShown && firstError) {
            alert(firstError);
        }
    } catch (err) {
        console.error("Error fetching inscriptions:", err.message);
    }
}
