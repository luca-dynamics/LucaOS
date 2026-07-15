import React from "react";
import { Icon } from "../ui/Icon";
import {
  lucaMaterialControlStyle,
  lucaMaterialMetricStyle,
} from "../../styles/lucaMaterialSystem";

interface FileItem {
  name: string;
  size: string;
  type: string;
  date: string;
}

interface MobileFileManagerProps {
  files: FileItem[];
  usingRealFiles: boolean;
}

const MobileFileManager: React.FC<MobileFileManagerProps> = ({
  files,
  usingRealFiles,
}) => {
  const FileIcon: React.FC<{ type: string }> = ({ type }) => {
    switch (type) {
      case "IMG":
      case "JPG":
      case "PNG":
        return <Icon name="Image" size={14} variant="BoldDuotone" />;
      case "DOC":
      case "PDF":
        return <Icon name="FileText" size={14} variant="BoldDuotone" />;
      case "AUDIO":
      case "WAV":
      case "MP3":
        return <Icon name="Music" size={14} variant="BoldDuotone" />;
      case "VIDEO":
      case "MP4":
        return <Icon name="Video" size={14} variant="BoldDuotone" />;
      case "DIR":
        return <Icon name="Folder" size={14} variant="BoldDuotone" />;
      default:
        return <Icon name="FileText" size={14} variant="BoldDuotone" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 justify-between">
        <div className="relative flex-1 max-w-sm">
          <Icon
            name="Search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--luca-text-tertiary)]"
            size={14}
            variant="BoldDuotone"
          />
          <input
            type="text"
            placeholder="Search storage..."
            className="w-full rounded border py-2 pl-10 pr-4 font-mono text-xs focus:border-[var(--luca-accent-primary)] focus:outline-none"
            style={lucaMaterialControlStyle}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {files.length > 0 ? (
          <table className="w-full text-left font-mono text-xs text-[var(--luca-text-secondary)]">
            <thead className="sticky top-0 text-[10px] uppercase tracking-wider text-[var(--luca-text-tertiary)]" style={lucaMaterialMetricStyle}>
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Size</th>
                <th className="p-3 text-right">Modified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--luca-border-subtle)]">
              {files.map((file, i) => (
                <tr
                  key={i}
                  className="group cursor-pointer transition-colors hover:bg-[var(--luca-surface-hover)] hover:text-[var(--luca-accent-primary)]"
                >
                  <td className="p-3 flex items-center gap-3 truncate max-w-[200px]">
                    <FileIcon type={file.type} />
                    <span className="truncate text-[var(--luca-text-primary)] group-hover:text-[var(--luca-accent-primary)]">
                      {file.name}
                    </span>
                  </td>
                  <td className="p-3">{file.type}</td>
                  <td className="p-3">{file.size}</td>
                  <td className="p-3 text-right">{file.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 py-20 text-[var(--luca-text-tertiary)]">
            <Icon name="Folder" size={48} className="opacity-20" variant="BoldDuotone" />
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--luca-text-secondary)]">
                {usingRealFiles
                  ? "No Files Found"
                  : "Secondary Storage Offline"}
              </p>
              <p className="text-[10px] font-mono mt-1 opacity-60">
                {usingRealFiles
                  ? "Real host data connected but directory is empty."
                  : "Bridge to device file system not established."}
              </p>
            </div>
          </div>
        )}
      </div>

      {!usingRealFiles && (
        <div className="mt-auto border-t border-[var(--luca-border-subtle)] p-4 text-center text-[10px] italic text-[var(--luca-text-tertiary)]">
          Note: Local Core connection is required for live file synchronization.
        </div>
      )}
    </div>
  );
};

export default MobileFileManager;
