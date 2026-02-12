import { useState } from 'react';
import { Copy, FolderTree, File, Folder, GitBranch, Github, Check, Lock, Unlock, Eye, EyeOff, Info, ShieldCheck, Download, FileText } from 'lucide-react';

interface TreeItem {
  path: string;
  type: 'tree' | 'blob';
  mode: string;
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: TreeItem[];
  truncated: boolean;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'folder' | 'file';
  children?: TreeNode[];
}

function App() {
  const [repoInput, setRepoInput] = useState('');
  const [branchInput, setBranchInput] = useState('main');
  const [patToken, setPatToken] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [showPatInput, setShowPatInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [treeData, setTreeData] = useState<TreeItem[]>([]);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [isPrivateRepo, setIsPrivateRepo] = useState(false);
  
  // Export functionality state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [exportOutput, setExportOutput] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);

  const fetchRepoStructure = async () => {
    if (!repoInput.trim()) {
      setError('Please enter a repository name');
      return;
    }

    setLoading(true);
    setError('');
    setTreeData([]);
    setIsPrivateRepo(false);
    setSelectedFiles(new Set());
    setExportOutput('');
    setShowExportPanel(false);

    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github+json',
      };

      if (patToken.trim()) {
        headers['Authorization'] = `Bearer ${patToken.trim()}`;
      }

      const response = await fetch(
        `https://api.github.com/repos/${repoInput.trim()}/git/trees/${branchInput.trim() || 'main'}?recursive=1`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          if (!patToken.trim()) {
            throw new Error('Repository or branch not found. If this is a private repository, please provide a Personal Access Token.');
          }
          throw new Error('Repository or branch not found. Please check the name and your PAT permissions.');
        }
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your Personal Access Token.');
        }
        if (response.status === 403) {
          const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
          if (rateLimitRemaining === '0') {
            throw new Error('GitHub API rate limit exceeded. Please add a Personal Access Token for higher limits.');
          }
          throw new Error('Access forbidden. Please check your PAT permissions.');
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data: GitHubTreeResponse = await response.json();

      const repoInfoResponse = await fetch(
        `https://api.github.com/repos/${repoInput.trim()}`,
        { headers }
      );
      if (repoInfoResponse.ok) {
        const repoInfo = await repoInfoResponse.json();
        setIsPrivateRepo(repoInfo.private || false);
      }

      if (data.truncated) {
        setError('Warning: Repository is very large. Some files may not be shown.');
      }

      setTreeData(data.tree);
      setShowExportPanel(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repository');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, identifier?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (identifier) {
        setCopiedPath(identifier);
        setTimeout(() => setCopiedPath(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const buildTreeStructure = (): TreeNode[] => {
    const root: TreeNode[] = [];
    const map: { [key: string]: TreeNode } = {};

    treeData.forEach((item) => {
      const parts = item.path.split('/');
      const name = parts[parts.length - 1];
      
      const node: TreeNode = {
        name,
        path: item.path,
        type: item.type === 'tree' ? 'folder' : 'file',
        children: item.type === 'tree' ? [] : undefined,
      };

      map[item.path] = node;
    });

    treeData.forEach((item) => {
      const parts = item.path.split('/');
      
      if (parts.length === 1) {
        root.push(map[item.path]);
      } else {
        const parentPath = parts.slice(0, -1).join('/');
        const parent = map[parentPath];
        
        if (parent && parent.children) {
          parent.children.push(map[item.path]);
        }
      }
    });

    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'folder' ? -1 : 1;
      });
      
      nodes.forEach((node) => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(root);
    return root;
  };

  const renderTreeLines = (nodes: TreeNode[], prefix: string = '', output: string[] = []): string[] => {
    nodes.forEach((node, index) => {
      const isLastNode = index === nodes.length - 1;
      const connector = isLastNode ? '└── ' : '├── ';
      const line = prefix + connector + (node.type === 'folder' ? `📁 ${node.name}` : `📄 ${node.name}`);
      
      output.push(line);

      if (node.children && node.children.length > 0) {
        const newPrefix = prefix + (isLastNode ? '    ' : '│   ');
        renderTreeLines(node.children, newPrefix, output);
      }
    });

    return output;
  };

  const toggleFileSelection = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllFiles = () => {
    const allFiles = treeData.filter(item => item.type === 'blob').map(item => item.path);
    setSelectedFiles(new Set(allFiles));
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  const generateExport = async () => {
    if (selectedFiles.size === 0) {
      setError('Please select at least one file to export');
      return;
    }

    setExportLoading(true);
    setError('');

    const [owner, repo] = repoInput.trim().split('/');
    let output = `<${repo}>\n`;

    try {
      for (const path of Array.from(selectedFiles)) {
        let content;

        if (patToken.trim()) {
          const apiUrl = `https://api.github.com/repos/${repoInput.trim()}/contents/${path}?ref=${branchInput.trim() || 'main'}`;
          const headers = {
            'Accept': 'application/vnd.github+json',
            'Authorization': `Bearer ${patToken.trim()}`
          };

          const response = await fetch(apiUrl, { headers });

          if (!response.ok) {
            output += `<${path}>:\nError fetching file\n\n`;
            continue;
          }

          const data = await response.json();
          content = atob(data.content);
        } else {
          const url = `https://raw.githubusercontent.com/${repoInput.trim()}/${branchInput.trim() || 'main'}/${path}`;
          const response = await fetch(url);

          if (!response.ok) {
            output += `<${path}>:\nError fetching file\n\n`;
            continue;
          }

          content = await response.text();
        }

        output += `<${path}>:\n${content}\n\n`;
      }

      setExportOutput(output);
    } catch (err) {
      setError('Error fetching file contents: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setExportLoading(false);
    }
  };

  const TreeView = () => {
    const tree = buildTreeStructure();
    const files = treeData.filter(item => item.type === 'blob');

    const renderNode = (node: TreeNode, depth: number = 0, isLast: boolean = false, parentIsLast: boolean[] = []): JSX.Element => {
      const isFolder = node.type === 'folder';
      const isSelected = selectedFiles.has(node.path);

      return (
        <div key={node.path}>
          <div className="flex items-center gap-2 py-1.5 font-mono text-sm group hover:bg-gradient-to-r hover:from-emerald-50 hover:to-transparent rounded-lg px-2 transition-all duration-200">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
              {depth > 0 && (
                <div className="flex items-center">
                  {parentIsLast.map((last, i) => (
                    <span key={i} className="text-slate-300" style={{ width: '24px' }}>
                      {!last ? '│' : ' '}
                    </span>
                  ))}
                  <span className="text-slate-300">
                    {isLast ? '└──' : '├──'}
                  </span>
                </div>
              )}
            </div>

            {!isFolder && showExportPanel && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleFileSelection(node.path)}
                className="w-4 h-4 accent-emerald-600 cursor-pointer"
              />
            )}

            {isFolder ? (
              <Folder className="w-4 h-4 text-amber-500 flex-shrink-0 ml-1" />
            ) : (
              <File className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
            )}

            <span className="text-slate-700 flex-1 font-medium">
              {node.name}
            </span>

            <button
              onClick={() => copyToClipboard(node.path, node.path)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 hover:bg-slate-100 rounded"
              title="Copy path"
            >
              {copiedPath === node.path ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              )}
            </button>
          </div>

          {node.children && node.children.length > 0 && (
            <div>
              {node.children.map((child, idx) => 
                renderNode(child, depth + 1, idx === node.children!.length - 1, [...parentIsLast, isLast])
              )}
            </div>
          )}
        </div>
      );
    };

    return (
      <div>
        {showExportPanel && files.length > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800">File Export</h3>
                <span className="text-sm text-slate-600">
                  ({selectedFiles.size} of {files.length} selected)
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllFiles}
                  className="px-3 py-1.5 text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg transition-colors font-medium"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllFiles}
                  className="px-3 py-1.5 text-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg transition-colors font-medium"
                >
                  Deselect All
                </button>
                <button
                  onClick={generateExport}
                  disabled={exportLoading || selectedFiles.size === 0}
                  className="px-4 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg transition-colors font-semibold shadow-sm disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {exportLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Generate Export
                    </>
                  )}
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600">
              Select files to export their contents in a single formatted output. Checkboxes appear next to files below.
            </p>
          </div>
        )}
        {tree.map((node, index) => renderNode(node, 0, index === tree.length - 1, []))}
      </div>
    );
  };

  const formatTreeAsText = () => {
    const tree = buildTreeStructure();
    const lines = renderTreeLines(tree);
    return lines.join('\n');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl shadow-lg">
              <Github className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 via-emerald-700 to-blue-700">
              GitHub Tree Viewer
            </h1>
          </div>
          <p className="text-lg text-slate-600 font-medium">
            Explore, visualize, and export from any GitHub repository
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 mb-6">
          <div className="grid md:grid-cols-[2fr,1fr,auto] gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Repository
              </label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={repoInput}
                  onChange={(e) => setRepoInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRepoStructure()}
                  placeholder="username/repository"
                  className="w-full pl-11 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Branch
              </label>
              <div className="relative">
                <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchRepoStructure()}
                  placeholder="main"
                  className="w-full pl-11 pr-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchRepoStructure}
                disabled={loading}
                className="w-full md:w-auto px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <FolderTree className="w-5 h-5" />
                    Fetch
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-slate-100">
            <button
              onClick={() => setShowPatInput(!showPatInput)}
              className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-emerald-600 transition-colors mb-3"
            >
              {patToken.trim() ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>{showPatInput ? 'Hide' : 'Add'} Personal Access Token</span>
              {patToken.trim() && (
                <span className="ml-2 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">
                  ✓ Authenticated
                </span>
              )}
            </button>

            {showPatInput && (
              <div className="space-y-3">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPat ? 'text' : 'password'}
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-11 pr-12 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                  />
                  <button
                    onClick={() => setShowPat(!showPat)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    type="button"
                  >
                    {showPat ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-emerald-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex gap-2 mb-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-bold mb-1">How to create a PAT:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800">
                        <li>GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
                        <li>Click "Generate new token (classic)"</li>
                        <li>Select the <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono">repo</code> scope</li>
                        <li>Copy and paste the token above</li>
                      </ol>
                      <p className="mt-2 text-xs text-blue-700 font-semibold">
                        🔒 Your token is stored only in browser memory
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}
        </div>

        {treeData.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6 mb-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-slate-100">
              <div className="flex items-center gap-2">
                <FolderTree className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-black text-slate-800">
                  Repository Structure
                </h2>
                <span className="text-sm text-slate-500 font-semibold">
                  ({treeData.length} items)
                </span>
                {isPrivateRepo && (
                  <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs rounded-full font-bold">
                    <Lock className="w-3 h-3" />
                    Private
                  </span>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(formatTreeAsText(), 'all')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
              >
                {copiedPath === 'all' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Tree
                  </>
                )}
              </button>
            </div>

            <div className="max-h-[600px] overflow-y-auto bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border-2 border-slate-200">
              <TreeView />
            </div>
          </div>
        )}

        {exportOutput && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-600" />
                <h2 className="text-xl font-black text-slate-800">Exported Files</h2>
              </div>
              <button
                onClick={() => copyToClipboard(exportOutput, 'export')}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                {copiedPath === 'export' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </>
                )}
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto bg-slate-900 rounded-xl p-4 font-mono text-sm text-emerald-400 whitespace-pre-wrap border-2 border-slate-700">
              {exportOutput}
            </div>
          </div>
        )}

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-white to-emerald-50/50 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-3xl">📖</span>
              How to Use
            </h3>
            <ol className="space-y-3 text-slate-700">
              <li className="flex gap-3">
                <span className="font-black text-emerald-600 flex-shrink-0">1.</span>
                <span>Enter repository as <code className="px-2 py-1 bg-slate-100 rounded-lg text-sm font-mono">username/repo</code></span>
              </li>
              <li className="flex gap-3">
                <span className="font-black text-emerald-600 flex-shrink-0">2.</span>
                <span>Specify branch (defaults to main)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-black text-emerald-600 flex-shrink-0">3.</span>
                <span><strong>Optional:</strong> Add PAT for private repos</span>
              </li>
              <li className="flex gap-3">
                <span className="font-black text-emerald-600 flex-shrink-0">4.</span>
                <span>Click <strong>Fetch</strong> to load structure</span>
              </li>
              <li className="flex gap-3">
                <span className="font-black text-emerald-600 flex-shrink-0">5.</span>
                <span>Select files and <strong>Generate Export</strong> to get contents</span>
              </li>
            </ol>
          </div>

          <div className="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/50 p-6">
            <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-3xl">✨</span>
              Features
            </h3>
            <ul className="space-y-3 text-slate-700">
              <li className="flex gap-3">
                <span className="text-emerald-600 flex-shrink-0 font-black">•</span>
                <span><strong>Tree View:</strong> Visual directory structure</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-600 flex-shrink-0 font-black">•</span>
                <span><strong>File Export:</strong> Extract multiple file contents</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-600 flex-shrink-0 font-black">•</span>
                <span><strong>Private Repos:</strong> Access with PAT authentication</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-600 flex-shrink-0 font-black">•</span>
                <span><strong>Quick Copy:</strong> One-click path and content copying</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
