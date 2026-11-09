import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource-variable/public-sans/index.css'
import '@fontsource-variable/source-serif-4/index.css'
import './index.css'
import { App } from './App'

registerSW({ immediate: true })

// Roteador de dados com uma rota só: o App segue com os seus <Routes>, e useBlocker (editor de fluxo) vale para qualquer saída.
const roteador = createBrowserRouter([{ path: '*', element: <App /> }])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={roteador} />
  </StrictMode>,
)
