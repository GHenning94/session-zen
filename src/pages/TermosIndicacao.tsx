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
              </div>
            </section>

            {/* Seção 4 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                4. Pagamentos
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>As comissões são calculadas sobre o valor líquido efetivamente recebido pelo TherapyPro, já descontadas taxas, impostos, estornos e chargebacks.</li>
                <li>As comissões passam por um período de validação e ficam com status "pendente" até o encerramento do ciclo de faturamento e do prazo de contestação do pagamento.</li>
                <li>Os pagamentos são processados mensalmente, até o dia 15 do mês subsequente, referentes às comissões aprovadas no mês anterior.</li>
                <li>O valor mínimo para saque é de R$ 50,00.</li>
                <li>É necessário manter dados bancários válidos ou conta Stripe Connect configurada para receber os pagamentos.</li>
                <li>O TherapyPro poderá solicitar validação dos dados bancários informados, incluindo documentos, confirmação de titularidade ou outros meios de verificação, como condição para liberação dos pagamentos.</li>
                <li>O TherapyPro reserva-se o direito de reter, suspender ou cancelar pagamentos em caso de suspeita de fraude, irregularidade ou violação destes termos.</li>
              </ul>
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

            {/* Seção 6 - SAÍDA DO PROGRAMA */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                6. Saída do Programa
              </h3>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
                <p className="text-sm font-medium text-destructive mb-2">⚠️ Atenção: Ação Irreversível</p>
                <p className="text-sm text-muted-foreground">
                  Ao optar por deixar o Programa de Indicação, esteja ciente das seguintes consequências:
                </p>
              </div>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li><strong>Perda do direito a comissões futuras:</strong> Ao optar por sair do Programa de Indicação, o parceiro perde o direito a receber comissões futuras, incluindo comissões recorrentes de indicados ativos.</li>
                <li><strong>Comissões pendentes:</strong> Comissões pendentes ou não liquidadas até a data da solicitação de saída poderão ser canceladas, a critério do TherapyPro.</li>
                <li><strong>Ação irreversível:</strong> Esta ação não pode ser desfeita. Caso deseje participar novamente, será necessário iniciar do zero, com um novo link de indicação, sem recuperação de indicações ou histórico anterior.</li>
                <li><strong>Link de indicação desativado:</strong> Seu link de indicação será permanentemente desativado e não poderá ser reativado.</li>
              </ul>
            </section>

            {/* Seção 7 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                7. Cancelamento e Reembolsos
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Se o indicado cancelar a assinatura dentro do período de reembolso, a comissão correspondente será estornada.</li>
                <li>Comissões pendentes podem ser ajustadas em caso de chargebacks ou disputas de pagamento.</li>
                <li>O programa pode ser encerrado ou modificado a qualquer momento, com aviso prévio de 30 dias.</li>
              </ul>
            </section>

            {/* Seção 8 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                8. Responsabilidades
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>O TherapyPro não se responsabiliza por perdas decorrentes de informações bancárias incorretas fornecidas pelo parceiro.</li>
                <li>É responsabilidade do parceiro declarar os rendimentos obtidos através do programa de acordo com as leis fiscais aplicáveis.</li>
                <li>O TherapyPro pode solicitar documentação adicional para verificação de identidade antes de processar pagamentos.</li>
              </ul>
            </section>

            {/* Seção 9 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                9. Modificações
              </h3>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>O TherapyPro reserva-se o direito de modificar estes termos a qualquer momento.</li>
                <li>Alterações significativas serão comunicadas por e-mail com antecedência mínima de 15 dias.</li>
                <li>O uso continuado do programa após alterações constitui aceitação dos novos termos.</li>
              </ul>
            </section>

            {/* Seção 10 */}
            <section>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                10. Contato
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
