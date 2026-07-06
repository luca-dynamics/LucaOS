import OperationsSidebar from "../../components/layout/OperationsSidebar";

const webSidebarTheme = {
  primary: "var(--luca-accent-primary)",
  border: "var(--luca-border-subtle, var(--app-border-main))",
  bg: "var(--luca-surface, var(--app-bg-main))",
  glow: "var(--luca-accent-soft)",
  coreColor: "var(--luca-accent-primary)",
  hex: "var(--luca-accent-primary)",
  themeName: "luca",
};

const noop = () => undefined;
const asyncNoop = async () => undefined;

/**
 * Browser-safe adapter for the real desktop OperationsSidebar.
 *
 * The shared sidebar owns presentation and web action guards. This adapter only
 * supplies inert host callbacks until matching browser surfaces are promoted.
 */
export function WebRealOperationsSidebar() {
  return (
    <div data-luca-web-real-operations-sidebar className="h-full min-h-0">
      <OperationsSidebar
        experienceMode="basic"
        theme={webSidebarTheme}
        isMobile={false}
        activeMobileTab=""
        isListeningAmbient={false}
        setWirelessTab={noop}
        setShowWirelessManager={noop}
        setShowNetworkMap={noop}
        executeTool={asyncNoop}
        devices={[]}
        handleDeviceControlClick={noop}
        installedModules={[]}
        cryptoWallet={null}
        forexAccount={null}
        osintProfile={null}
        hackingLogs={[]}
        setShowSkillsMatrix={noop}
        setVisualData={noop}
        setShowAppExplorer={noop}
        setShowLucaRecorder={noop}
        setStockTerminalSymbol={noop}
        setShowStockTerminal={noop}
        setShowTradingTerminal={noop}
        setShowSubsystemDashboard={noop}
        setShowInvestigationReports={noop}
        setShowDarkWebScanner={noop}
        setShowIngestionModal={noop}
        setShowCodeEditor={noop}
        setShowPredictionTerminal={noop}
        setShowLucaLinkModal={noop}
        setShowCryptoTerminal={noop}
        setShowForexTerminal={noop}
        setShowOsintDossier={noop}
        setShowHackingTerminal={noop}
        setShowAgentMode={noop}
        setShowThoughtProcess={noop}
        connectionTier="CLOUD"
      />
    </div>
  );
}

export default WebRealOperationsSidebar;
