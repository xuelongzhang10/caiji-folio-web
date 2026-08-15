import { HashRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './state/store'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Holdings from './pages/Holdings'
import Dividends from './pages/Dividends'
import Plans from './pages/Plans'
import Settings from './pages/Settings'

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="holdings" element={<Holdings />} />
            <Route path="dividends" element={<Dividends />} />
            <Route path="plans" element={<Plans />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
