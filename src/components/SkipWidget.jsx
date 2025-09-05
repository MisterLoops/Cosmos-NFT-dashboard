import { Widget } from "@skip-go/widget";
import { setApiOptions } from "@skip-go/client";
import { useEffect, useState } from "react";

const SkipWidget = ({ showSkipWidget, onClose, connectedAddresses, getCosmosSigner, defaultRoute }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
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
      setTimeout(() => setIsVisible(true), 100); // Small delay to trigger CSS transition
      setTimeout(() => setIsFooterVisible(true), 400);
    } else {
      setIsVisible(false);
      setIsFooterVisible(false);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [showSkipWidget]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showSkipWidget) {
        onClose();
      }
    };

    if (showSkipWidget) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [showSkipWidget, onClose]);

  if (!shouldRender) return null;

  const widgetProps = {
    theme: {
    brandColor: '#ff66ff',
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
      ghostButtonHover: '#000000ff',
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
    settings: {
      slippage: 1,
      useUnlimitedApproval: true,
    },
    connectedAddresses,
    getCosmosSigner,
    ...(defaultRoute ? {
      defaultRoute: {
        destChainId: defaultRoute?.destChainId || undefined,
        destAssetDenom: defaultRoute?.destAssetDenom || undefined,
      },
    } : {
      defaultRoute: {
        destChainId: undefined,
        destAssetDenom: undefined,
      }
    }
    ),
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
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease-in-out",
        pointerEvents: isVisible ? "auto" : "none",
      }}
    >
      {/* Background overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(31, 27, 46, 0.9)",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
          zIndex: 0,
        }}
      />

      {/* Background decoration */}
      <div
        className="mobile-modal-bg"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "500px",
          height: "50%",
          transform: "translate(-50%, -50%)",
          backgroundImage: "url('./dark-bg.svg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,1)",
          boxShadow: "0 0 5px rgba(205,102,255,0.5)",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.7s ease-in-out",
          zIndex: 1,
        }}
      />

      {/* Gradient background layer */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "500px",
          height: "50%",
          transform: "translate(-50%, -50%)",
          borderRadius: "20px",
          background: "linear-gradient(90deg, #1f1b2e, #2b2340)",
          opacity: isVisible ? 0.8 : 0,
          transition: "opacity 0.7s ease-in-out",
          zIndex: 2,
        }}
      />

      {/* Close Button */}
      <button
        className="mobile-close-btn"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "calc(27.5% - 75px)",
          right: "calc(50% - 20px)",
          width: "40px",
          height: "40px",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: "50%",
          color: "#fff",
          fontSize: "18px",
          cursor: "pointer",
          zIndex: 6,
          transition: "all 0.5s ease",
          backdropFilter: "blur(10px)",
        }}
        onMouseOver={(e) => {
          e.target.style.background = "rgba(255, 102, 255, 0.3)";
          e.target.style.borderColor = "rgba(255, 102, 255, 0.6)";
          e.target.style.transform = "scale(1.1)";
        }}
        onMouseOut={(e) => {
          e.target.style.background = "rgba(255,255,255,0.1)";
          e.target.style.borderColor = "rgba(255,255,255,0.3)";
          e.target.style.transform = "scale(1)";
        }}
      >
        ×
      </button>

      {/* Modal Content */}
      <div
        className="mobile-modal-content"
        style={{
          maxWidth: "500px",
          width: "100%",
          padding: "0 10px",
          position: "relative",
          opacity: isVisible ? 1 : 0,
          transition: "opacity 1s ease-in-out",
          zIndex: 5,
        }}
      >
        <Widget {...widgetProps} />

        <div
          style={{
            marginTop: "10px",
            bottom: "10px",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.7)",
            opacity: isFooterVisible ? 1 : 0,
            transition: "opacity 3s ease-in-out",
          }}
        >
          <a
            href="https://go.skip.build/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#FF66FF",
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            go.skip.build
          </a>{" "}
          is powered by Cosmos Hub, IBC Eureka & Skip:Go ❤️
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-modal-bg {
            width: 90% !important;
            height: auto !important;
            max-height: 70% !important;
          }
          .mobile-modal-content {
            width: 90% !important;
            padding: 0 5px !important;
          }
          .mobile-close-btn {
            top: 25px !important;
            right: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default SkipWidget;
