import { Widget } from "@skip-go/widget";
import { setApiOptions } from "@skip-go/client";
import { useEffect, useState } from "react";

const SkipWidget = ({ 
    showSkipWidget, 
    onClose, 
    connectedAddresses = {}, 
    signers = null 
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        setApiOptions({
            apiURL: '/api/skip',
            cumulativeAffiliateFeeBps: "200",
            chainIdsToAffiliates: {
                "interwoven-1": {
                    affiliates: [
                        {
                            address: "init1xrrwujj7yph2kh803x4nu8s90m2nd8dg5t07z7",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "injective-1": {
                    affiliates: [
                        {
                            address: "inj1xrrwujj7yph2kh803x4nu8s90m2nd8dgs5cfmy",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "neutron-1": {
                    affiliates: [
                        {
                            address: "neutron1d2y72xglnyrphze97kqfmccysdqpf4992na84y",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "osmosis-1": {
                    affiliates: [
                        {
                            address: "osmo1d2y72xglnyrphze97kqfmccysdqpf499xh84e3",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "elys-1": {
                    affiliates: [
                        {
                            address: "elys1d2y72xglnyrphze97kqfmccysdqpf499wvdzzp",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "archway-1": {
                    affiliates: [
                        {
                            address: "archway1d2y72xglnyrphze97kqfmccysdqpf499m8gp95",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "bbn-1": {
                    affiliates: [
                        {
                            address: "bbn1d2y72xglnyrphze97kqfmccysdqpf499ej95s6",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "chihuahua-1": {
                    affiliates: [
                        {
                            address: "chihuahua1d2y72xglnyrphze97kqfmccysdqpf499deetwp",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "migaloo-1": {
                    affiliates: [
                        {
                            address: "migaloo1d2y72xglnyrphze97kqfmccysdqpf499rcal6d",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "core-1": {
                    affiliates: [
                        {
                            address: "persistence1d2y72xglnyrphze97kqfmccysdqpf499qqjkp8",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "pryzm-1": {
                    affiliates: [
                        {
                            address: "pryzm1d2y72xglnyrphze97kqfmccysdqpf499kurz3s",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "phoenix-1": {
                    affiliates: [
                        {
                            address: "terra13zxrmk824fuv8v6t4tedmpctqe64re9m52u678",
                            basisPointsFee: "200",
                        },
                    ],
                },
                "pacific-1": {
                    affiliates: [
                        {
                            address: "sei1d2y72xglnyrphze97kqfmccysdqpf499rq9nfz",
                            basisPointsFee: "200",
                        },
                    ],
                },
            },
        });
    }, []);

    useEffect(() => {
        if (showSkipWidget) {
            setShouldRender(true);
            // Small delay to ensure DOM is ready before animation
            setIsVisible(true);
        } else {
            setIsVisible(false);
            // Wait for animation to complete before unmounting
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 1);
            return () => clearTimeout(timer);
        }
    }, [showSkipWidget]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && showSkipWidget) {
                onClose();
            }
        };

        if (showSkipWidget) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            // document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [showSkipWidget, onClose]);

    // Don't render anything if not showing
    if (!shouldRender) return null;

    const isMobile = window.innerWidth <= 768;

    // ✅ Create widget props with conditional signer integration
    const widgetProps = {
        theme: {
            brandColor: '#FF66FF',
            borderRadius: {
                main: '25px',
                selectionButton: '10px',
                ghostButton: '30px',
                modalContainer: '20px',
                rowItem: '12px',
            },
            primary: {
                background: {
                    normal: '#000000',
                },
                text: {
                    normal: '#ffffff',
                    lowContrast: '#ffffff80',
                    ultraLowContrast: '#ffffff4D',
                },
                ghostButtonHover: '#00000066',
            },
            secondary: {
                background: {
                    normal: '#141414',
                    transparent: '#252525B3',
                    hover: '#4A4A4A',
                },
            },
            success: {
                text: '#6fde00',
            },
            warning: {
                background: '#411f00',
                text: '#ff7a00',
            },
            error: {
                background: '#430000',
                text: '#ff1616',
            },
        },
        defaultRoute: {
            destChainId: 'mantra-1',
            destAssetDenom: 'uom',
            srcChainId: 'mantra-1',
            srcAssetDenom: 'ibc/65D0BEC6DAD96C7F5043D1E54E54B6BB5D5B3AEC3FF6CEBB75B9E059F3580EA3',
        },
        filter: {
            // source: {},
            // destination: {},
        },
        filterOut: {
            // source: {},
            // destination: {},
        },
        routeConfig: {
            allowMultiTx: true,
        },
        settings: {
            slippage: 1, // Fixed: regular number instead of BigInt
            useUnlimitedApproval: true,
        },
        // ✅ Conditional signer props - only add when signers are available
        ...(signers && connectedAddresses && Object.keys(connectedAddresses).length > 0 && {
            connectedAddresses: connectedAddresses,
            signers: {
                getCosmosSigner: async (chainId) => {
                    console.log(`[DEBUG] Getting Cosmos signer for chain: ${chainId}`);
                    if (signers[chainId]) {
                        return signers[chainId];
                    }
                    throw new Error(`No signer available for chain ${chainId}`);
                },
                // Add EVM signer if you support EVM chains
                getEvmSigner: async () => {
                    throw new Error("EVM signer not implemented");
                },
                // Add SVM signer if you support Solana
                getSvmSigner: async () => {
                    throw new Error("SVM signer not implemented");
                }
            }
        }),
        // ✅ Add callbacks for transaction events
        callbacks: {
            onWalletConnected: (walletInfo) => {
                console.log('[Skip] Wallet connected:', walletInfo);
            },
            onWalletDisconnected: () => {
                console.log('[Skip] Wallet disconnected');
            },
            onTransactionBroadcasted: (txInfo) => {
                console.log('[Skip] Transaction broadcasted:', txInfo);
            },
            onTransactionComplete: (txInfo) => {
                console.log('[Skip] Transaction completed:', txInfo);
            },
            onTransactionFailed: (error) => {
                console.error('[Skip] Transaction failed:', error);
            }
        }
    };

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
                opacity: isVisible ? 1 : 0, // 👈 animation
                transition: "opacity 0.3s ease-in-out",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "#1f1b2e",
                    opacity: 0.9, // adjust opacity here
                    zIndex: -2,
                }}
            />
            {/* background layer */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "500px",          // fixed square size (adjust as needed)
                    height: "45%",         // same as width
                    transform: "translate(-50%, -50%)", // center it
                    backgroundImage: "url('./dark-bg.svg')",
                    backgroundSize: "cover",           // ensures the image fills the square
                    backgroundPosition: "center center", // crop horizontally & vertically centered
                    backgroundRepeat: "no-repeat",
                    borderRadius: "20px",              // rounded corners
                    border: "1px solid rgba(255, 255, 255, 1)",
                    boxShadow: "0 0 5px rgba(205, 102, 255, 0.5)",
                    opacity: 1,                       // image opacity
                    zIndex: -1,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "500px",
                    height: "45%",
                    transform: "translate(-50%, -50%)", // same centering
                    borderRadius: "20px",
                    background: "linear-gradient(90deg, #1f1b2e, #2b2340)",
                    opacity: 0.8,
                    zIndex: -1, // sits above bg, below content
                }}
            />
            {/* content */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: "500px",
                    width: "90%",
                    padding: "0 10px",
                    position: "relative",
                    transform: isVisible
                        ? "scale(1) translateY(0)"
                        : "scale(0.9) translateY(-20px)",
                    opacity: isVisible ? 1 : 0,
                    transition: "all 0.3s ease-out",
                }}
            >
                {/* ✅ Widget with conditional signer props */}
                <Widget {...widgetProps} />
            </div>
        </div>
    );
};

export default SkipWidget;