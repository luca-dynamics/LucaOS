import React from "react";
import { Icon } from "../../components/ui/Icon";
import WhatsAppManager from "../../components/WhatsAppManager";
import TelegramManager from "../../components/TelegramManager";
import TwitterManager from "../../components/social/TwitterManager";
import InstagramManager from "../../components/social/InstagramManager";
import LinkedInManager from "../../components/social/LinkedInManager";
import DiscordManager from "../../components/social/DiscordManager";
import YouTubeManager from "../../components/social/YouTubeManager";
import WeChatManager from "../../components/social/WeChatManager";
import LucaLinkModal from "../../components/LucaLinkModal";
import ProfileManager from "../../components/ProfileManager";
import CodeEditor from "../../components/CodeEditor";
import IngestionModal from "../../components/IngestionModal";
import AppExplorerModal from "../../components/AppExplorerModal";
import MobileFileBrowser from "../../components/MobileFileBrowser";
import MobileManager from "../../components/MobileManager";
import {
  canRenderOverlayPanel,
  type OverlayPanelId,
} from "../overlaySurfacePolicy";

interface SharedOverlayPanelsProps {
  theme: any;
  showWhatsAppManager: boolean;
  setShowWhatsAppManager: (show: boolean) => void;
  showTelegramManager: boolean;
  setShowTelegramManager: (show: boolean) => void;
  showTwitterManager: boolean;
  setShowTwitterManager: (show: boolean) => void;
  showInstagramManager: boolean;
  setShowInstagramManager: (show: boolean) => void;
  showLinkedInManager: boolean;
  setShowLinkedInManager: (show: boolean) => void;
  showDiscordManager: boolean;
  setShowDiscordManager: (show: boolean) => void;
  showYouTubeManager: boolean;
  setShowYouTubeManager: (show: boolean) => void;
  showWeChatManager: boolean;
  setShowWeChatManager: (show: boolean) => void;
  showLucaLinkModal: boolean;
  setShowLucaLinkModal: (show: boolean) => void;
  localIp: string;
  showProfileManager: boolean;
  setShowProfileManager: (show: boolean) => void;
  handleSaveProfile: (profile: any) => void;
  userProfile: any;
  showCodeEditor: boolean;
  setShowCodeEditor: (show: boolean) => void;
  currentCwd: string;
  showIngestionModal: boolean;
  setShowIngestionModal: (show: boolean) => void;
  handleIngest: (data: any) => void;
  ingestionState: any;
  showAppExplorer: boolean;
  setShowAppExplorer: (show: boolean) => void;
  showMobileFileBrowser: boolean;
  setShowMobileFileBrowser: (show: boolean) => void;
  serverUrl: string;
  showMobileManager: boolean;
  setShowMobileManager: (show: boolean) => void;
  activeMobileDevice: any;
}

const SharedOverlayPanels: React.FC<SharedOverlayPanelsProps> = ({
  theme,
  showWhatsAppManager,
  setShowWhatsAppManager,
  showTelegramManager,
  setShowTelegramManager,
  showTwitterManager,
  setShowTwitterManager,
  showInstagramManager,
  setShowInstagramManager,
  showLinkedInManager,
  setShowLinkedInManager,
  showDiscordManager,
  setShowDiscordManager,
  showYouTubeManager,
  setShowYouTubeManager,
  showWeChatManager,
  setShowWeChatManager,
  showLucaLinkModal,
  setShowLucaLinkModal,
  localIp,
  showProfileManager,
  setShowProfileManager,
  handleSaveProfile,
  userProfile,
  showCodeEditor,
  setShowCodeEditor,
  currentCwd,
  showIngestionModal,
  setShowIngestionModal,
  handleIngest,
  ingestionState,
  showAppExplorer,
  setShowAppExplorer,
  showMobileFileBrowser,
  setShowMobileFileBrowser,
  serverUrl,
  showMobileManager,
  setShowMobileManager,
  activeMobileDevice,
}) => {
  const shouldRender = (panelId: OverlayPanelId) =>
    canRenderOverlayPanel(panelId);

  return (
    <>
      {showWhatsAppManager && shouldRender("whatsAppManager") && (
        <WhatsAppManager
          onClose={() => setShowWhatsAppManager(false)}
          theme={theme}
        />
      )}

      {showTelegramManager && shouldRender("telegramManager") && (
        <TelegramManager
          onClose={() => setShowTelegramManager(false)}
          theme={theme}
        />
      )}

      {showTwitterManager && shouldRender("twitterManager") && (
        <TwitterManager
          onClose={() => setShowTwitterManager(false)}
          theme={theme}
        />
      )}

      {showInstagramManager && shouldRender("instagramManager") && (
        <InstagramManager
          onClose={() => setShowInstagramManager(false)}
          theme={theme}
        />
      )}

      {showLinkedInManager && shouldRender("linkedInManager") && (
        <LinkedInManager
          onClose={() => setShowLinkedInManager(false)}
          theme={theme}
        />
      )}

      {showDiscordManager && shouldRender("discordManager") && (
        <DiscordManager
          onClose={() => setShowDiscordManager(false)}
          theme={theme}
        />
      )}

      {showYouTubeManager && shouldRender("youTubeManager") && (
        <YouTubeManager
          onClose={() => setShowYouTubeManager(false)}
          theme={theme}
        />
      )}

      {showWeChatManager && shouldRender("weChatManager") && (
        <WeChatManager
          onClose={() => setShowWeChatManager(false)}
          theme={theme}
        />
      )}

      {showLucaLinkModal && shouldRender("lucaLinkModal") && (
        <LucaLinkModal
          onClose={() => setShowLucaLinkModal(false)}
          localIp={localIp || window.location.hostname}
        />
      )}

      {showProfileManager && shouldRender("profileManager") && (
        <ProfileManager
          onClose={() => setShowProfileManager(false)}
          onSave={handleSaveProfile}
          currentProfile={userProfile || undefined}
        />
      )}

      {showCodeEditor && shouldRender("codeEditor") && (
        <CodeEditor
          onClose={() => setShowCodeEditor(false)}
          initialCwd={currentCwd || "."}
          theme={theme}
        />
      )}

      {showIngestionModal && shouldRender("ingestionModal") && (
        <IngestionModal
          onClose={() => setShowIngestionModal(false)}
          onIngest={handleIngest}
          theme={theme}
        />
      )}

      {ingestionState.active && shouldRender("ingestionOverlay") && (
        <div className="absolute inset-0 z-[950] bg-black/90 flex flex-col items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] border border-green-500/50 bg-[var(--app-bg-tint)] p-8 flex flex-col relative overflow-hidden shadow-[0_0_50px_rgba(34,197,94,0.2)] rounded-lg">
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(0deg,transparent,rgba(34,197,94,0.5)_50%,transparent)] animate-scan"></div>
            <div className="flex items-center gap-4 text-green-500 font-bold tracking-widest text-xl mb-6 border-b border-green-500/30 pb-4">
              <Icon
                name="Dna"
                className="animate-spin-slow w-8 h-8"
                variant="BoldDuotone"
              />
              <div>
                <div>LUCA EVOLUTION PROTOCOL</div>
                <div className="text-[10px] text-green-400/60 font-mono">
                  INTEGRATING AGENTIC CAPABILITIES...
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden text-xs font-mono text-green-400/80 space-y-2 pl-4 border-l-2 border-green-500/20">
              {ingestionState && ingestionState.skills.length > 0
                ? ingestionState.skills.map((skill: string, i: number) => (
                    <div
                      key={`skill-${i}`}
                      className="animate-in zoom-in duration-500 flex items-center gap-2 text-[color:var(--app-text-main)] font-bold tracking-wider"
                    >
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      ACQUIRED SKILL: {skill}
                    </div>
                  ))
                : (ingestionState && ingestionState.files.length > 0
                    ? ingestionState.files.slice(-8)
                    : [
                        "Initializing Deep Scan...",
                        "Parsing Jupyter Notebooks...",
                        "Extracting Algorithmic Logic...",
                        "Identifying Agent Architectures...",
                        "Synthesizing Luca Pathways...",
                      ]
                  ).map((file: string, i: number) => (
                    <div
                      key={i}
                      className="truncate animate-in slide-in-from-left-4 fade-in duration-500 flex items-center gap-2"
                    >
                      <span className="text-green-700">&gt;</span>
                      {file}
                    </div>
                  ))}
            </div>
          </div>
        </div>
      )}

      {showAppExplorer && shouldRender("appExplorer") && (
        <AppExplorerModal
          isOpen={showAppExplorer}
          onClose={() => setShowAppExplorer(false)}
        />
      )}

      {showMobileFileBrowser && shouldRender("mobileFileBrowser") && (
        <MobileFileBrowser
          onClose={() => setShowMobileFileBrowser(false)}
          serverUrl={serverUrl}
        />
      )}

      {showMobileManager && shouldRender("mobileManager") && (
        <MobileManager
          device={activeMobileDevice}
          onClose={() => setShowMobileManager(false)}
        />
      )}
    </>
  );
};

export default SharedOverlayPanels;
