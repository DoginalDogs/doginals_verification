document.addEventListener('DOMContentLoaded', function() {
    let userId = new URLSearchParams(window.location.search).get('user_id');
    let clientId = '1195885802786394154';
    let redirectUri = 'https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/callback';
    let oauthSuccess = new URLSearchParams(window.location.search).get('oauth_success') === 'True';

    const loginDiscordButton = document.getElementById('loginDiscord');
    const loginWalletButton = document.getElementById('loginWallet');
    const logoutDiscordButton = document.getElementById('logoutDiscord');

    if (logoutDiscordButton) {
        logoutDiscordButton.addEventListener('click', logoutFromDiscord);
    }

    if (loginDiscordButton) {
        loginDiscordButton.addEventListener('click', function() {
            if (clientId && redirectUri) {
                window.location.href = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify`;
            } else {
                console.error("OAuth details are missing.");
                alert("OAuth details are missing.");
            }
        });
    }

    if (oauthSuccess) {
        loginDiscordButton.style.display = 'none';
        logoutDiscordButton.style.display = 'block';
        loginWalletButton.style.display = 'block';
    }

    if (loginWalletButton) {
        loginWalletButton.addEventListener('click', function() {
            if (typeof window.dogeLabs !== 'undefined') {
                signMessageWithDogeLabsWallet(userId);
            } else {
                alert("Please install the DogeLabs Wallet extension.");
            }
        });
    }
});

function logoutFromDiscord() {
    sessionStorage.removeItem('discordToken');
    document.getElementById('loginDiscord').style.display = 'block';
    document.getElementById('loginWallet').style.display = 'none';
    document.getElementById('logoutDiscord').style.display = 'none';
    alert('You have been logged out from Discord.');
}

async function getDoginals(userId, cursor = 0, allInscriptions = []) {
    try {
        const response = await window.dogeLabs.getInscriptions(cursor);
        console.log("Inscriptions:", response);

        if (response.list.length === 0 && cursor === 0) {
            alert('Sorry, you have no Doginal Dogs in your wallet! Adopt a dog, come back, and try again!');
            return;
        }

        allInscriptions = allInscriptions.concat(response.list);

        if (response.list.length > 0) {
            // Continue fetching if we received a non-empty list
            await getDoginals(userId, cursor + 20, allInscriptions);
        } else {
            console.log("Total Inscriptions:", allInscriptions);

            const inscriptionData = allInscriptions.map(inscription => ({
                user_id: userId,
                inscriptionId: inscription.inscriptionId,
                inscriptionNumber: inscription.inscriptionNumber,
                address: inscription.address
            }));

            console.log(inscriptionData);

            const res = await fetch('https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/verify_holder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ optimized_data: inscriptionData, user_id: userId })
            });

            const data = await res.json();
            console.log(data);

            if (data && data.length > 0) {
                let alertShown = false;
                let firstError = "";

                data.forEach(response => {
                    if (!alertShown) {
                        if (response.hasOwnProperty('message')) {
                            alert(response.message);
                            alertShown = true;
                        } else if (response.hasOwnProperty('error') && !firstError) {
                            firstError = response.error;
                        }
                    }
                });

                if (!alertShown && firstError) {
                    alert(firstError);
                }
            } else {
                alert('Unexpected response format from server.');
            }
        }
    } catch (error) {
        console.error("Error fetching inscriptions:", error.message);
    }
}

async function signMessageWithDogeLabsWallet(userId) {
    if (typeof window.dogeLabs === 'undefined') {
        alert("Please install the DogeLabs Wallet extension.");
        return;
    }

    try {
        const accounts = await window.dogeLabs.requestAccounts();

        if (!accounts || accounts.length === 0) {
            alert("No accounts found. Please ensure your wallet is connected and try again.");
            return;
        }

        const messageToSign = "Sign to Prove Ownership";
        const messageType = "text";

        const signature = await window.dogeLabs.signMessage(messageToSign, messageType);
        console.log("Message Signature:", signature);

        const response = await fetch('https://doginal-dogs-verification-2cc9b2edc81a.herokuapp.com/verify_signature', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ signature: signature, user_id: userId })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data);
        await getDoginals(userId);
    } catch (error) {
        console.error("Error:", error.message);
    }
}