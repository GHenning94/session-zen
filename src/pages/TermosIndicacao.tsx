import { Layout } from "@/components/Layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, CheckCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

const TermosIndicacao = () => {
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Termos e Condições do Programa de Indicação</CardTitle>
            <CardDescription>
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="max-w-none space-y-6">
            {/* Seção 1 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                1. Elegibilidade
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Para participar do Programa de Indicação, você deve ser um usuário ativo do TherapyPro com uma conta válida.</li>
                <li>Usuários de qualquer plano (Básico, Profissional ou Premium) podem participar do programa.</li>
                <li>É necessário aceitar estes termos e condições para se tornar um parceiro de indicação.</li>
                <li><strong>Auto-indicação é proibida.</strong> Você não pode indicar a si mesmo ou usar seu próprio link de indicação.</li>
              </ul>
            </section>

            {/* Seção 2 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                2. Como Funciona
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Cada parceiro recebe um link de indicação único para compartilhar.</li>
                <li>Quando alguém se cadastra através do seu link e assina um plano pago (Profissional ou Premium), você recebe uma comissão.</li>
                <li>O indicado deve completar a assinatura de um plano pago para que a indicação seja validada.</li>
                <li>As comissões são recorrentes enquanto o indicado mantiver a assinatura ativa.</li>
              </ul>
              <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Importante:</strong> O pagamento imediato da assinatura pelo indicado não implica liberação imediata da comissão, que estará sujeita ao período de validação, confirmação do pagamento e às regras deste programa.
                </p>
              </div>
            </section>

            {/* Seção 3 - NOVA ESTRUTURA DE COMISSÕES */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                3. Estrutura de Comissões
              </h3>
              <div className="space-y-4 text-muted-foreground">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold text-foreground mb-2">Planos Mensais</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong className="text-primary">30% de comissão no primeiro mês</strong> - Promoção especial para novos indicados!</li>
                    <li><strong>15% de comissão nos meses seguintes</strong> - Comissão recorrente enquanto o indicado mantiver a assinatura.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                  <h4 className="font-semibold text-foreground mb-2">Planos Anuais</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>20% de comissão</strong> - Pago mensalmente (1/12 do valor anual por mês) enquanto o indicado mantiver a assinatura.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <h4 className="font-semibold text-foreground mb-2">Regra de Cálculo</h4>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Cada pagamento confirmado gera sua própria comissão, conforme o plano vigente no momento do pagamento.</li>
                    <li>Upgrades de plano não anulam comissões já geradas, exceto em caso de estorno, cancelamento dentro do prazo legal ou chargeback.</li>
                    <li>Créditos concedidos por upgrade proporcional (prorrata) não geram comissão. A comissão incide exclusivamente sobre valores efetivamente pagos.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Seção 5 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                5. Regras de Uso
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>É proibido criar múltiplas contas para obter comissões fraudulentamente.</li>
                <li>Não é permitido usar spam, anúncios enganosos ou práticas antiéticas para promover o serviço.</li>
                <li><strong>Auto-indicação (indicar a si mesmo) não é permitida e resultará em desqualificação.</strong></li>
                <li>O link de indicação deve ser compartilhado de forma transparente, informando que você receberá comissão.</li>
              </ul>
            </section>

            {/* Seção 6 - FUNCIONAMENTO DO LINK */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                6. Funcionamento do Link de Indicação
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Cada vez que um usuário ingressa no Programa de Indicação, é gerado um <strong>link exclusivo</strong>, válido apenas enquanto o usuário permanecer ativo no programa.</li>
                <li>O link de indicação é pessoal, intransferível e vinculado ao período de participação do usuário no programa.</li>
                <li>Indicações realizadas por meio do link ativo são registradas normalmente e podem gerar comissões conforme as regras vigentes.</li>
              </ul>
            </section>

            {/* Seção 7 - SAÍDA DO PROGRAMA */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                7. Saída do Programa
              </h3>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
                <p className="text-sm font-medium text-destructive mb-2">⚠️ Atenção: Leia com atenção</p>
                <p className="text-sm text-muted-foreground">
                  Ao optar por sair do Programa de Indicação, você declara estar ciente e concorda com as seguintes condições:
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Link desativado imediatamente:</strong> O link de indicação é imediatamente desativado e não poderá mais ser utilizado para novas indicações.</li>
                <li><strong>Perda de comissões futuras:</strong> O usuário deixa de receber comissões futuras, incluindo comissões recorrentes provenientes de indicados que permaneçam com assinatura ativa.</li>
                <li><strong>Comissões pendentes canceladas:</strong> Comissões pendentes, ainda em período de validação ou não liquidadas até a data da saída, serão canceladas e não serão pagas.</li>
                <li><strong>Comissões já aprovadas:</strong> Comissões já aprovadas antes da solicitação de saída poderão ser pagas no próximo ciclo de pagamento, desde que cumpridos os requisitos mínimos do programa.</li>
                <li><strong>Benefícios dos indicados mantidos:</strong> Benefícios concedidos aos indicados, como cupons de desconto, permanecem válidos e não são afetados pela saída do parceiro do programa.</li>
              </ul>
            </section>

            {/* Seção 8 - REINGRESSO */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                8. Reingresso no Programa
              </h3>
              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Importante:</strong> Caso decida reingressar no Programa de Indicação, um novo ciclo será iniciado do zero.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Novo ciclo de participação:</strong> Um novo ciclo de participação será iniciado.</li>
                <li><strong>Novo link gerado:</strong> Um novo link de indicação será gerado (o anterior não será reativado).</li>
                <li><strong>Contagem reiniciada:</strong> A contagem de indicados é reiniciada.</li>
                <li><strong>Histórico não recuperável:</strong> Indicações, comissões e histórico do ciclo anterior não são recuperados nem reativados.</li>
                <li><strong>Período de carência:</strong> O TherapyPro poderá aplicar um período de carência (cooldown) entre a saída e um novo ingresso, como medida de segurança e prevenção de uso indevido do programa.</li>
              </ul>
            </section>

            {/* Seção 9 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                9. Cancelamento e Reembolsos
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Se o indicado cancelar a assinatura dentro do período de reembolso, a comissão correspondente será estornada.</li>
                <li>Comissões pendentes podem ser ajustadas em caso de chargebacks ou disputas de pagamento.</li>
                <li>O programa pode ser encerrado ou modificado a qualquer momento, com aviso prévio de 30 dias.</li>
                <li><strong>Em caso de upgrade de plano, as comissões já geradas referentes a períodos pagos permanecem válidas, desde que não haja estorno ou cancelamento do pagamento original.</strong></li>
              </ul>
            </section>

            {/* Seção 10 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                10. Responsabilidades
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>O TherapyPro não se responsabiliza por perdas decorrentes de informações bancárias incorretas fornecidas pelo parceiro.</li>
                <li>É responsabilidade do parceiro declarar os rendimentos obtidos através do programa de acordo com as leis fiscais aplicáveis.</li>
                <li>O TherapyPro pode solicitar documentação adicional para verificação de identidade antes de processar pagamentos.</li>
              </ul>
            </section>

            {/* Seção 11 - AFILIADO INDICADO */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                11. Afiliado que foi Indicado
              </h3>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                <p className="text-sm font-medium text-foreground mb-2">📋 Regra de Comissão Única</p>
                <p className="text-sm text-muted-foreground">
                  Cada usuário pagante gera comissão exclusivamente para quem o indicou. Não há comissões em cadeia ou multinível.
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Caso o Afiliado também tenha ingressado na plataforma por meio de um link de indicação</strong>, as comissões serão atribuídas exclusivamente ao Afiliado responsável pela conversão paga original.</li>
                <li><strong>O fato de um usuário tornar-se Afiliado não gera, em hipótese alguma, comissões adicionais para o seu indicador</strong>, tampouco comissões em múltiplos níveis.</li>
                <li><strong>O Programa de Indicação não possui caráter multinível</strong>, sendo vedado o pagamento de comissões indiretas, em cadeia ou sobre outros afiliados.</li>
                <li>O vínculo de indicação (referrer) é <strong>definido no primeiro acesso via link e é imutável</strong>. Mesmo que o usuário indicado se torne afiliado posteriormente, o referrer original permanece inalterado.</li>
                <li>Um afiliado que foi indicado pode indicar novos usuários e <strong>receber comissão apenas de seus próprios indicados</strong> — seu indicador original não recebe nada sobre essas indicações.</li>
              </ul>
            </section>

            {/* Seção 12 - DISPOSIÇÕES GERAIS */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                12. Disposições Gerais
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>A participação no Programa de Indicação constitui um <strong>benefício condicional</strong>, não representando direito adquirido ou vitalício.</li>
                <li>O TherapyPro reserva-se o direito de cancelar, suspender ou ajustar comissões em caso de uso indevido, tentativa de manipulação do sistema ou violação destes termos.</li>
                <li>As regras do Programa de Indicação podem ser atualizadas a qualquer momento, conforme os termos gerais da plataforma.</li>
                <li><strong>A comissão está sempre vinculada ao pagamento confirmado e ao período de serviço correspondente, não sendo afetada por alterações futuras de plano, exceto nos casos expressamente previstos nestes termos.</strong></li>
              </ul>
            </section>

            {/* Seção 13 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                13. Modificações
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>O TherapyPro reserva-se o direito de modificar estes termos a qualquer momento.</li>
                <li>Alterações significativas serão comunicadas por e-mail com antecedência mínima de 15 dias.</li>
                <li>O uso continuado do programa após alterações constitui aceitação dos novos termos.</li>
              </ul>
            </section>

            {/* Seção 14 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                14. Contato
              </h3>
              <p className="text-muted-foreground">
                Para dúvidas sobre o Programa de Indicação, entre em contato através do e-mail{" "}
                <a href="mailto:suporte@therapypro.app.br" className="text-primary hover:underline">
                  suporte@therapypro.app.br
                </a>{" "}
                ou pela página de suporte na plataforma.
              </p>
            </section>


            <div className="pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Ao participar do Programa de Indicação do TherapyPro, você declara que leu, compreendeu e aceita todos os termos e condições descritos acima.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}

export default TermosIndicacao
