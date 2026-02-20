import { Routes, Route } from "react-router-dom"
import { Layout } from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import Agenda from "@/pages/Agenda"
import Clientes from "@/pages/Clientes"
import Pagamentos from "@/pages/Pagamentos"
import Configuracoes from "@/pages/Configuracoes"
import Relatorios from "@/pages/Relatorios"
import Sessoes from "@/pages/Sessoes"
import PaginaPublica from "@/pages/PaginaPublica"
import Integracoes from "@/pages/Integracoes"
import Pacotes from "@/pages/Pacotes"
import SessoesRecorrentes from "@/pages/SessoesRecorrentes"
import Upgrade from "@/pages/Upgrade"
import Eventos from "@/pages/Eventos"
import Prontuarios from "@/pages/Prontuarios"
import Estudos from "@/pages/Estudos"
import RedesSociais from "@/pages/RedesSociais"
import ProgramaIndicacao from "@/pages/ProgramaIndicacao"
import Suporte from "@/pages/Suporte"
import Documentacao from "@/pages/Documentacao"
import Metas from "@/pages/Metas"
import TermosIndicacao from "@/pages/TermosIndicacao"
import { Suspense } from "react"
import NotFound from "@/pages/NotFound"

/**
 * Layout persistente: sidebar e header permanecem montados ao trocar de página.
 * Apenas o conteúdo da rota (Outlet) é trocado, evitando recarregar avatar e menu.
 */
export function ProtectedLayoutContent() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/pagamentos" element={<Pagamentos />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/sessoes" element={<Sessoes />} />
        <Route path="/pacotes" element={<Pacotes />} />
        <Route path="/sessoes-recorrentes" element={<SessoesRecorrentes />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/upgrade" element={<Upgrade />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/prontuarios" element={<Prontuarios />} />
        <Route path="/metas" element={<Metas />} />
        <Route path="/estudos" element={<Estudos />} />
        <Route path="/redes-sociais" element={<RedesSociais />} />
        <Route path="/programa-indicacao" element={<ProgramaIndicacao />} />
        <Route path="/pagina-publica" element={<PaginaPublica />} />
        <Route path="/integracoes" element={<Integracoes />} />
        <Route path="/suporte" element={<Suporte />} />
        <Route path="/documentacao" element={<Documentacao />} />
        <Route path="/termos-indicacao" element={<TermosIndicacao />} />
        <Route path="*" element={<Suspense fallback={null}><NotFound /></Suspense>} />
      </Routes>
    </Layout>
  )
}
