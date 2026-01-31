# 🌳 GitHub Tree Viewer

<div align="center">

![GitHub Tree Viewer](https://img.shields.io/badge/GitHub-Tree_Viewer-2ea44f?style=for-the-badge&logo=github)
![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**A beautiful, interactive web application to visualize and explore the complete directory structure of any public or private GitHub repository.**

[Live Demo](https://git-tree-view-gamma.vercel.app/) • [Features](#-features) • [Getting Started](#-getting-started) • [Usage](#-usage) • [Tech Stack](#-tech-stack)

</div>

---

## ✨ Features

- 🔍 **Instant Visualization** - Fetch and display complete repository structures in seconds
- 🔐 **Private Repository Support** - Access private repos with Personal Access Token (PAT)
- 🌲 **Tree View** - Beautiful, hierarchical tree representation with folder/file icons
- 📋 **One-Click Copy** - Copy individual file paths or the entire tree structure
- 🎯 **Branch Support** - Explore any branch of a repository
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- ⚡ **Fast & Lightweight** - Built with modern React and Vite for optimal performance
- 🎨 **Clean UI** - Modern, intuitive interface with smooth animations
- 🔒 **Secure** - PAT stored only in browser memory, never sent to third-party servers
- 📊 **Rate Limit Friendly** - Support for authenticated requests (5,000/hour vs 60/hour)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/github-tree-viewer.git
   cd github-tree-viewer
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   
   Navigate to `http://localhost:5173` to see the application running.

### Building for Production

```bash
npm run build
npm run preview
```

## 📖 Usage

### Basic Usage (Public Repositories)

1. **Enter Repository Details**
   - Input the repository in the format: `username/repository`
   - Example: `facebook/react` or `microsoft/vscode`

2. **Specify Branch** (Optional)
   - Enter the branch name (defaults to `main`)
   - Common branches: `main`, `master`, `develop`, `staging`

3. **Fetch Structure**
   - Click the "Fetch" button or press Enter
   - Wait for the tree structure to load

4. **Interact with the Tree**
   - Browse the complete directory structure
   - Hover over items to reveal the copy button
   - Click to copy individual file paths
   - Use "Copy Tree" to copy the entire structure

### Private Repository Access

To access private repositories, you need to provide a GitHub Personal Access Token (PAT):

1. **Generate a Personal Access Token**
   - Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
   - Click "Generate new token (classic)"
   - Give it a descriptive name (e.g., "GitHub Tree Viewer")
   - Select the `repo` scope (this grants access to private repositories)
   - Set an appropriate expiration date
   - Click "Generate token" and copy it immediately

2. **Add Token to the App**
   - Click "Add Personal Access Token (for private repos)" in the app
   - Paste your token in the input field
   - The app will show "Authenticated" status when a token is present

3. **Security Notes**
   - Your token is stored only in browser memory
   - It's never sent to any server except GitHub's API
   - The token is not persisted and will be cleared on page refresh
   - For security, only grant the minimum necessary permissions

### Example Repositories to Try

**Public Repositories:**
- `facebook/react` - React JavaScript library
- `microsoft/vscode` - Visual Studio Code
- `vercel/next.js` - Next.js framework
- `tailwindlabs/tailwindcss` - Tailwind CSS

**Private Repositories:**
- Use your own private repos with a PAT
- Access organization private repositories (requires appropriate PAT permissions)

## 🛠️ Tech Stack

### Core Technologies

| Technology | Purpose |
|------------|---------|
| ![React](https://img.shields.io/badge/-React-61DAFB?logo=react&logoColor=black&style=flat) | UI framework for building the interface |
| ![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?logo=typescript&logoColor=white&style=flat) | Type-safe JavaScript development |
| ![Vite](https://img.shields.io/badge/-Vite-646CFF?logo=vite&logoColor=white&style=flat) | Fast build tool and dev server |
| ![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white&style=flat) | Utility-first CSS framework |

### Additional Tools

- **Lucide React** - Beautiful icon library
- **GitHub API** - Fetching repository tree data
- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📁 Project Structure

```
github-tree-viewer/
├── src/
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   ├── index.css            # Global styles
│   └── vite-env.d.ts        # Vite type definitions
├── public/                  # Static assets
├── index.html               # HTML template
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── vite.config.ts           # Vite configuration
└── README.md                # Project documentation
```

## 🎨 Key Components

### Tree Building Algorithm

The application uses a sophisticated algorithm to:
1. Fetch repository data from GitHub's Git Trees API
2. Parse flat file paths into hierarchical structure
3. Sort folders before files alphabetically
4. Render with proper tree connectors (├──, └──, │)

### Authentication Flow

- **Optional Authentication**: Works without PAT for public repos
- **Secure Token Handling**: PAT stored only in component state
- **Smart Error Messages**: Guides users to add PAT when needed
- **Privacy Indicator**: Shows lock icon for private repositories

### Features Breakdown

- **Smart Tree Rendering**: Efficient algorithm for building nested structures
- **Path Copy**: Individual file path copying with visual feedback
- **Bulk Export**: Copy entire tree structure in ASCII format
- **Error Handling**: User-friendly error messages for invalid repos
- **Loading States**: Visual feedback during API calls
- **Rate Limit Detection**: Informs users when limits are reached

## 🌐 API Usage

This application uses the **GitHub Git Data API**:

```
GET /repos/{owner}/{repo}/git/trees/{tree_sha}?recursive=1
```

### Authentication

```bash
# Without PAT (public repos only)
curl https://api.github.com/repos/facebook/react/git/trees/main?recursive=1

# With PAT (public and private repos)
curl -H "Authorization: Bearer YOUR_PAT" \
  https://api.github.com/repos/username/private-repo/git/trees/main?recursive=1
```

### Rate Limits

| Request Type | Rate Limit |
|--------------|------------|
| Unauthenticated | 60 requests per hour |
| Authenticated (PAT) | 5,000 requests per hour |

> **Note**: The app works without authentication for public repositories but requires a PAT for private repos.

## 🔒 Security & Privacy

### Personal Access Token Security

- **Client-Side Only**: Your PAT is only stored in browser memory
- **No Server Storage**: Token is never sent to any third-party server
- **Direct to GitHub**: Tokens are only used in direct API calls to GitHub
- **No Persistence**: Token is cleared on page refresh
- **User Control**: Easily toggle visibility and remove tokens

### Best Practices

1. **Use Fine-Grained Tokens**: Consider using fine-grained PATs with minimal permissions
2. **Set Expiration**: Always set an expiration date for your tokens
3. **Revoke When Done**: Revoke tokens when you no longer need them
4. **Don't Share**: Never share your PAT or commit it to version control

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed
- Ensure security best practices for PAT handling

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Very large repositories (10,000+ files) may be truncated by GitHub API
- PAT is not persisted across sessions (by design for security)
- Some organization repositories may require additional permissions

## 🔮 Future Enhancements

- [x] GitHub authentication for private repositories
- [x] Higher rate limits support
- [ ] Token persistence with encryption (optional)
- [ ] Fine-grained token support with custom permissions
- [ ] File size information display
- [ ] Search/filter functionality
- [ ] Export to different formats (JSON, YAML)
- [ ] Dark mode support
- [ ] Collapsible folders
- [ ] File type statistics
- [ ] Multi-repository comparison
- [ ] Repository favorites/bookmarks

## ❓ FAQ

### How do I access private repositories?

Click "Add Personal Access Token" in the app and provide a GitHub PAT with the `repo` scope. See the [Private Repository Access](#private-repository-access) section for detailed instructions.

### Is my Personal Access Token safe?

Yes. Your token is only stored in browser memory and is never sent to any server except GitHub's API. It's cleared on page refresh and never persisted.

### Why can't I see some files?

GitHub's API truncates very large repositories (10,000+ files). If you see a warning, some files may not be displayed. This is a GitHub API limitation.

### What permissions does the PAT need?

For basic private repository access, the `repo` scope is sufficient. For organization repositories, you may need additional permissions.

### Does this work for organization repositories?

Yes, both public and private organization repositories are supported with an appropriate PAT.

## 📧 Contact

**Project Maintainer**: Your Name

- GitHub: [@aryan-git-byte](https://github.com/aryan-git-byte)
- Email: aryan17550@gmail.com

## 🙏 Acknowledgments

- [GitHub API](https://docs.github.com/en/rest) for providing the data
- [Lucide](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for styling utilities
- [Vite](https://vitejs.dev/) for blazing fast development experience
- GitHub community for security best practices

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ by [Your Name](https://github.com/yourusername)

</div>
