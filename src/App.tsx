import { useState } from 'react';
import { Copy, FolderTree, File, Folder, GitBranch, Github, Check, Lock, Unlock, Eye, EyeOff, Info, ShieldCheck } from 'lucide-react';

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

  const fetchRepoStructure = async () => {
    if (!repoInput.trim()) {
      setError('Please enter a repository name');
      return;
    }

    setLoading(true);
    setError('');
    setTreeData([]);
    setIsPrivateRepo(false);

    try {
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github+json',
      };

      // Add authorization header if PAT is provided
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

      // Check if repo is private by trying to fetch repo info
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

  const TreeView = () => {
    const tree = buildTreeStructure();

    const renderNode = (node: TreeNode, depth: number = 0, isLast: boolean = false, parentIsLast: boolean[] = []): JSX.Element => {
      const isFolder = node.type === 'folder';

      return (
        <div key={node.path}>
          <div className="flex items-center gap-2 py-1 font-mono text-sm group hover:bg-slate-100 rounded px-2">
            <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
              {depth > 0 && (
                <div className="flex items-center">
                  {parentIsLast.map((last, i) => (
                    <span key={i} className="text-slate-400" style={{ width: '24px' }}>
                      {!last ? '│' : ' '}
                    </span>
                  ))}
                  <span className="text-slate-400">
                    {isLast ? '└──' : '├──'}
                  </span>
                </div>
              )}
            </div>

            {isFolder ? (
              <Folder className="w-4 h-4 text-blue-500 flex-shrink-0 ml-1" />
            ) : (
              <File className="w-4 h-4 text-slate-400 flex-shrink-0 ml-1" />
            )}

            <span className="text-slate-700 flex-1">
              {node.name}
            </span>

            <button
              onClick={() => copyToClipboard(node.path, node.path)}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1"
              title="Copy path"
            >
              {copiedPath === node.path ? (
                <Check className="w-4 h-4 text-green-600" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Github className="w-10 h-10 text-slate-700" />
            <h1 className="text-4xl font-bold text-slate-800">
              GitHub Tree Viewer
            </h1>
          </div>
          <p className="text-slate-600">
            Explore the structure of any public or private GitHub repository
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-[2fr,1fr,auto] gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
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
                  className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
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
                  className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchRepoStructure}
                disabled={loading}
                className="w-full md:w-auto px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          {/* PAT Section */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowPatInput(!showPatInput)}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors mb-3"
            >
              {patToken.trim() ? (
                <ShieldCheck className="w-4 h-4 text-green-600" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>{showPatInput ? 'Hide' : 'Add'} Personal Access Token (for private repos)</span>
              {patToken.trim() && (
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  Authenticated
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
                    className="w-full pl-11 pr-12 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-sm"
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

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2 mb-2">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-1">How to create a Personal Access Token:</p>
                      <ol className="list-decimal list-inside space-y-1 text-blue-800">
                        <li>Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)</li>
                        <li>Click "Generate new token (classic)"</li>
                        <li>Give it a descriptive name and select the <code className="bg-blue-100 px-1 rounded">repo</code> scope</li>
                        <li>Copy the token and paste it above</li>
                      </ol>
                      <p className="mt-2 text-xs text-blue-700">
                        <strong>Note:</strong> Your token is only stored in your browser's memory and never sent to any server except GitHub's API.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-3">
                  <Unlock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Benefits of using a PAT:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Access private repositories</li>
                      <li>Higher rate limits (5,000 requests/hour vs 60)</li>
                      <li>Access organization repositories</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {treeData.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-800">
                  Repository Structure
                </h2>
                <span className="text-sm text-slate-500">
                  ({treeData.length} items)
                </span>
                {isPrivateRepo && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                    <Lock className="w-3 h-3" />
                    Private
                  </span>
                )}
              </div>
              <button
                onClick={() => copyToClipboard(formatTreeAsText(), 'all')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {copiedPath === 'all' ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
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

            <div className="max-h-[600px] overflow-y-auto bg-slate-50 rounded-lg p-4">
              <TreeView />
            </div>
          </div>
        )}

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">📖</span>
              How to Use
            </h3>
            <ol className="space-y-3 text-slate-600">
              <li className="flex gap-3">
                <span className="font-bold text-blue-600 flex-shrink-0">1.</span>
                <span>Enter repository in <code className="px-1.5 py-0.5 bg-slate-100 rounded text-sm">username/repo</code> format</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600 flex-shrink-0">2.</span>
                <span>Specify branch name (defaults to main)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600 flex-shrink-0">3.</span>
                <span><strong>Optional:</strong> Add your Personal Access Token for private repos</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600 flex-shrink-0">4.</span>
                <span>Click <strong>Fetch</strong> to load structure</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-600 flex-shrink-0">5.</span>
                <span>Hover to copy paths or use <strong>Copy Tree</strong></span>
              </li>
            </ol>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Use Cases
            </h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex gap-3">
                <span className="text-blue-600 flex-shrink-0">•</span>
                <span><strong>Quick Overview:</strong> Understand repository organization instantly</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 flex-shrink-0">•</span>
                <span><strong>Private Repos:</strong> Access your private repositories with PAT</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 flex-shrink-0">•</span>
                <span><strong>Documentation:</strong> Generate directory structures for docs</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 flex-shrink-0">•</span>
                <span><strong>Collaboration:</strong> Share file paths with team members</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
