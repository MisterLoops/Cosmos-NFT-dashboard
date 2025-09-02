import { Widget } from "@skip-go/widget";
import { setApiOptions } from "@skip-go/client";
import { useEffect, useState } from "react";

const SkipWidget = ({ 
    showSkipWidget, 
    onClose, 
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        setApiOptions({
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
        defaultRoute: {},
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
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection:"column",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 10,
                opacity: isVisible ? 1 : 0,
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
                    opacity: 0.9,
                    zIndex: 0,
                }}
            />
            {/* background layer */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "500px",
                    height: "45%",
                    transform: "translate(-50%, -50%)",
                    backgroundImage: "url('./dark-bg.svg')",
                    backgroundSize: "cover",
                    backgroundPosition: "center center",
                    backgroundRepeat: "no-repeat",
                    borderRadius: "20px",
                    border: "1px solid rgba(255, 255, 255, 1)",
                    boxShadow: "0 0 5px rgba(205, 102, 255, 0.5)",
                    opacity: 1,
                    zIndex: 1,
                }}
            />
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    width: "500px",
                    height: "45%",
                    transform: "translate(-50%, -50%)",
                    borderRadius: "20px",
                    background: "linear-gradient(90deg, #1f1b2e, #2b2340)",
                    opacity: 0.8,
                    zIndex: 2,
                }}
            />
            
            {/* Close Button */}
            <button
                onClick={onClose}
                style={{
                    position: "absolute",
                    top: "calc(27.5% - 75px)",
                    right: "calc(50% - 20px)",
                    width: "40px",
                    height: "40px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "50%",
                    color: "#ffffff",
                    fontSize: "18px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 6,
                    transition: "all 0.2s ease",
                    backdropFilter: "blur(10px)",
                }}
                onMouseOver={(e) => {
                    e.target.style.background = "rgba(255, 102, 255, 0.3)";
                    e.target.style.borderColor = "rgba(255, 102, 255, 0.6)";
                    e.target.style.transform = "scale(1.1)";
                }}
                onMouseOut={(e) => {
                    e.target.style.background = "rgba(255, 255, 255, 0.1)";
                    e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
                    e.target.style.transform = "scale(1)";
                }}
            >
                ×
            </button>

            {/* content */}
            <div
                style={{
                    maxWidth: "500px",
                    width: "100%",
                    padding: "0 10px",
                    position: "relative",
                    transform: isVisible
                        ? "scale(1) translateY(0)"
                        : "scale(0.9) translateY(-20px)",
                    opacity: isVisible ? 1 : 0,
                    transition: "all 0.3s ease-out",
                    zIndex:5
                }}
            >
                {/* ✅ Widget with conditional signer props */}
                <Widget {...widgetProps} />
            </div>
        </div>
    );
};

export default SkipWidget;