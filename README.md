# Canopy 🌲

Canopy is an interactive 2.5D tree asset studio built with React, Three.js, and custom GLSL shaders. It provides a creative environment for composing scenes with tree assets, featuring two distinct modes for different interactions.

<img width="2874" height="2022" alt="Screenshot 2026-05-08 at 10 25 15" src="https://github.com/user-attachments/assets/a453ac96-42a1-452f-b1b9-5529e6dde2e3" />

## Modes

-   **Studio Mode:** A full-featured editor where you can place, select, and inspect individual tree assets. It includes panels for browsing assets, viewing the scene hierarchy, and adjusting properties of selected objects.
-   **Forest Mode:** A performance-oriented mode that renders a dense forest using a single volumetric mesh, demonstrating an alternative rendering technique for large-scale scenes.

## Key Features

-   **Interactive Scene Editor:** Drag-and-drop assets, move the camera, and interact with your scene in real-time.
-   **Asset Management:** Place, select, and inspect tree assets with an intuitive UI.
-   **Real-time Environment Controls:** Dynamically adjust environment properties like wind intensity, direction, and forest density.
-   **Dual Rendering Modes:**
    -   **Studio:** Uses `InstancedMesh` for efficient rendering of many individual objects.
    -   **Forest:** Uses a custom volumetric `BufferGeometry` for a stylized, dense forest effect.
-   **Custom GLSL Shaders:** Trees are rendered using custom shaders for unique visual styles (cone, fractal, ridge).
-   **Modern UI:** A sleek, animated, and non-intrusive UI built with Tailwind CSS and Motion.
-   **State Management:** Centralized and predictable state managed by Zustand.

## Tech Stack

-   **Framework:** [React](https://react.dev/) with [Vite](https://vitejs.dev/)
-   **3D Rendering:** [Three.js](https://threejs.org/) with [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber/) and [@react-three/drei](https://github.com/pmndrs/drei)
-   **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Animation:** [Motion One](https://motion.dev/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)

## Codebase Architecture

The `src` directory is organized to separate concerns, making the project modular and easy to navigate.

-   `src/components/`: Contains the main React components.
    -   `editor/`: UI panels specific to the Studio mode (e.g., `InspectorPanel`, `AssetBrowser`).
    -   `Forest.tsx`: The component that renders the dense forest view.
    -   `SceneEditor.tsx`: The main component for the studio editing experience.
-   `src/lib/`: Core logic, utility functions, and constants.
    -   `treeAssetCatalog.ts`: Defines the available tree assets.
    -   `sceneEnvironment.ts`: Manages environment properties and their conversion to shader uniforms.
    -   `textureCache.ts`: Preloads and caches textures for performance.
-   `src/shaders/`: Custom Three.js materials built with GLSL. Each file represents a different shader/material for rendering trees.
-   `src/store/`: Zustand store for global application state.
    -   `editorStore.ts`: Manages editor mode, selected assets, environment parameters, etc.

## Getting Started

Follow these steps to set up and run the project locally.

**Prerequisites:**

-   [Node.js](https://nodejs.org/) (LTS version recommended)
-   [Git](https://git-scm.com/)

**Installation:**

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Open the `.env` file and add your Gemini API Key:
    ```
    GEMINI_API_KEY=your_api_key_here
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## Available Scripts

-   `npm run dev`: Starts the Vite development server.
-   `npm run build`: Builds the application for production.
-   `npm run preview`: Serves the production build locally.
-   `npm run lint`: Runs TypeScript type-checking.

## Screenshots

*(Placeholder: Add screenshots of the Studio and Forest modes here to showcase the application.)*
