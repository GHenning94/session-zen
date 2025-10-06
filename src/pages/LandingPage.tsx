import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Stethoscope, Calendar, Users, DollarSign, TrendingUp,
  CheckCircle, ArrowRight, Brain, Heart, Shield, Clock,
  GraduationCap, Target, BookOpen, Activity, BarChart3,
  MessageCircle, ChevronDown, Lock, Mail, Globe, BarChart,
  Gift, ChevronsLeftRight, Instagram, Linkedin, Twitter
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useColorTheme } from "@/hooks/useColorTheme"
import { useState, useEffect, useRef, useLayoutEffect } from "react"
import { CookieNotice } from "@/components/CookieNotice"

// --- NOVAS IMPORTAÇÕES ---
import antesImg from '../assets/antes.webp';
import depoisImg from '../assets/depois.webp';


// Importações do GSAP
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import "./LandingPage.styles.css"

// --- HOOKS E COMPONENTES AUXILIARES ---

const useIntersectionObserver = (options) => {
  const [elementRef, setElementRef] = useState(null);
  const [entry, setEntry] = useState(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);
    if (elementRef) observer.observe(elementRef);
    return () => { if (elementRef) observer.unobserve(elementRef) };
  }, [elementRef, options]);

  return [setElementRef, entry];
};

const AnimateOnScroll = ({ children, className = '', id = '' }) => {
  const [ref, entry] = useIntersectionObserver({ threshold: 0.1 });
  const isVisible = entry?.isIntersecting;
  return (
    <div ref={ref} id={id} className={`${className} fade-in-section ${isVisible ? 'is-visible' : ''}`}>
      {children}
    </div>
  );
};

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-border/50">
      <button className="flex justify-between items-center w-full py-5 text-left" onClick={() => setIsOpen(!isOpen)}>
        <span className="text-lg font-medium text-foreground">{question}</span>
        <ChevronDown className={`w-5 h-5 text-primary transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden"><p className="pb-5 text-muted-foreground pr-4">{answer}</p></div>
      </div>
    </div>
  );
};


// --- COMPONENTE PRINCIPAL ---

const LandingPage = () => {
  gsap.registerPlugin(ScrollTrigger); 

  const navigate = useNavigate()
  const { resetToDefaultColors } = useColorTheme()
  const [displayText, setDisplayText] = useState("")
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [currentCharIndex, setCurrentCharIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [waitingToDelete, setWaitingToDelete] = useState(false)
  const words = ["atendimentos", "agendamentos", "ganhos", "clientes"]
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  // --- NOVO ESTADO PARA O SLIDER ---
  const [sliderPosition, setSliderPosition] = useState(50);

  const sectionPinRef = useRef(null);
  const trackContainerRef = useRef(null);
  const trackRef = useRef(null);
  
  // --- Refs para a barra de rolagem ---
  const scrollbarContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
    document.documentElement.setAttribute('data-theme', 'light')
    document.body.style.colorScheme = 'light'
    resetToDefaultColors()
    return () => { document.body.style.colorScheme = '' }
  }, [resetToDefaultColors])

  useEffect(() => {
    const word = words[currentWordIndex]
    let timeout: NodeJS.Timeout
    if (waitingToDelete) {
      timeout = setTimeout(() => { setWaitingToDelete(false); setIsDeleting(true); }, 2000)
    } else if (isDeleting) {
      if (currentCharIndex > 0) {
        timeout = setTimeout(() => { setCurrentCharIndex(prev => prev - 1); setDisplayText(word.substring(0, currentCharIndex - 1)); }, 75)
      } else {
        setIsDeleting(false); setCurrentWordIndex(prev => (prev + 1) % words.length);
      }
    } else {
      if (currentCharIndex < word.length) {
        timeout = setTimeout(() => { setCurrentCharIndex(prev => prev + 1); setDisplayText(word.substring(0, currentCharIndex + 1)); }, 150)
      } else if (!waitingToDelete) {
        setWaitingToDelete(true);
      }
    }
    return () => clearTimeout(timeout)
  }, [currentCharIndex, currentWordIndex, isDeleting, waitingToDelete])
  
  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    if (!mediaQuery.matches) return;
  
    let ctx = gsap.context(() => {
      const track = trackRef.current;
      const container = trackContainerRef.current;
      const scrollbarTrack = scrollbarTrackRef.current;
      const scrollbarThumb = scrollbarThumbRef.current;
  
      if (!track || !container || !scrollbarTrack || !scrollbarThumb) return;
  
      const scrollDistance = track.scrollWidth - container.clientWidth;
  
      if (scrollDistance > 0) {
        
        const tl = gsap.timeline({ paused: true });
        
        const barWidth = 48; // Largura da barrinha
        const ballSize = 8;
        const trackWidth = scrollbarTrack.clientWidth;
        const maxThumbPosition = trackWidth - barWidth;

        // ESTÁGIOS DA ANIMAÇÃO:
        tl.fromTo(scrollbarThumb, 
          { width: ballSize, height: ballSize, borderRadius: '50%', scale: 0, x: 0 },
          { scale: 1, duration: 0.3, ease: 'power2.out' }
        );
        tl.to(scrollbarThumb, 
          { width: barWidth, borderRadius: '4px', duration: 0.4, ease: 'power2.inOut' },
          "+=0.1"
        );
        tl.to(scrollbarThumb, 
          { x: maxThumbPosition, ease: 'none', duration: 2 }
        );
        tl.to(scrollbarThumb, 
          { width: ballSize, borderRadius: '50%', duration: 0.4, ease: 'power2.inOut' }
        );
        tl.to(scrollbarThumb, 
          { scale: 0, duration: 0.3, ease: 'power2.in' }
        );

        // Animação principal de rolagem dos cards
        gsap.to(track, {
          x: -scrollDistance,
          ease: "none",
          scrollTrigger: {
            trigger: sectionPinRef.current,
            start: "top top",
            end: () => `+=${scrollDistance}`,
            scrub: 1.5,
            pin: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              tl.progress(self.progress);
            },
            onToggle: (self) => {
              gsap.to(scrollbarContainerRef.current, { 
                  opacity: self.isActive ? 1 : 0, 
                  duration: 0.3 
              });
            },
          },
        });
      }
    }, sectionPinRef);
  
    return () => ctx.revert();
  }, []);


  const features = [
    { icon: Calendar, title: "Agendamento Inteligente", description: "Otimize sua rotina com uma agenda clara, evitando conflitos e maximizando seu tempo." },
    { icon: Users, title: "Gestão de Clientes", description: "Centralize informações, histórico e progresso dos pacientes em um prontuário seguro e de fácil acesso." },
    { icon: DollarSign, title: "Controle Financeiro", description: "Acompanhe pagamentos, despesas e sua receita de forma automatizada e sem complicações." },
    { icon: TrendingUp, title: "Relatórios Estratégicos", description: "Obtenha insights valiosos sobre o crescimento da sua prática com dados claros e objetivos." },
    { icon: Lock, title: "Prontuários Seguros", description: "Dados criptografados e em conformidade com as normas de segurança para sua tranquilidade." },
    { icon: Gift, title: "Programa de Indicação", description: "Acreditamos no poder da comunidade. Indique o TherapyPro para colegas e receba uma comissão a cada nova assinatura gerada." },
    { icon: Globe, title: "Página Pública", description: "Crie uma página profissional para que novos clientes possam te encontrar e agendar uma consulta." },
    { icon: BarChart, title: "Metas e Evolução", description: "Acompanhe o progresso dos seus clientes com gráficos e anotações de evolução." }
  ]

  const professionals = [
    { name: "Psicólogos", icon: Brain }, { name: "Psicanalistas", icon: BookOpen }, { name: "Terapeutas", icon: Heart },
    { name: "Coaches", icon: Target }, { name: "Psiquiatras", icon: Activity }, { name: "Terapeutas Ocupacionais", icon: GraduationCap },
    { name: "Consultores", icon: MessageCircle }, { name: "Mentores", icon: Shield },
  ]
  
  const testimonials = [
    { name: "Dr. Ana Costa", role: "Psicóloga Clínica", text: "O TherapyPro revolucionou a gestão do meu consultório. Agora tenho mais tempo para focar no que realmente importa: meus pacientes.", imgSrc: "https://i.pravatar.cc/150?img=1" },
    { name: "Juliana Pereira", role: "Terapeuta Ocupacional", text: "Excelente ferramenta! A gestão de agendamentos e o histórico de clientes são funcionalidades que me economizam horas toda semana.", imgSrc: "https://i.pravatar.cc/150?img=26" },
    { name: "Carlos Martins", role: "Psicanalista", text: "A plataforma é intuitiva, segura e completa. Os relatórios financeiros me deram uma visão clara do crescimento da minha prática.", imgSrc: "https://i.pravatar.cc/150?img=33" },
    { name: "Dr. Ricardo Souza", role: "Psiquiatra", text: "A segurança dos prontuários era minha maior preocupação. Com o TherapyPro, sinto total confiança na proteção dos dados dos meus pacientes.", imgSrc: "https://i.pravatar.cc/150?img=68" },
    { name: "Mariana Lima", role: "Coach de Carreira", text: "Uso para gerenciar meus clientes e pagamentos. É simples, direto e muito eficiente. Recomendo!", imgSrc: "https://i.pravatar.cc/150?img=49" },
    { name: "Fernando Guimarães", role: "Terapeuta Holístico", text: "O suporte é incrível e a plataforma está sempre evoluindo. Sinto que minhas sugestões são ouvidas.", imgSrc: "https://i.pravatar.cc/150?img=53" },
  ]
  
  const faqItems = [
    { question: "O TherapyPro é seguro para os dados dos meus pacientes?", answer: "Sim. A segurança é nossa prioridade máxima. Utilizamos criptografia de ponta para proteger todos os dados e seguimos as melhores práticas de segurança, em conformidade com as normas de proteção de dados." },
    { question: "Posso testar a plataforma antes de assinar?", answer: "Com certeza! Oferecemos um plano Básico totalmente gratuito, ideal para você começar e conhecer as principais funcionalidades. Você pode fazer o upgrade para um plano superior a qualquer momento." },
    { question: "Como funciona o suporte ao cliente?", answer: "Oferecemos suporte humano e personalizado. Nos planos Profissional e Premium, você tem acesso a suporte prioritário por e-mail e chat para garantir que qualquer dúvida seja resolvida rapidamente." },
    { question: "A plataforma se integra com outras ferramentas?", answer: "Sim. O TherapyPro oferece integração com o Google Calendar para sincronização de agenda e, no plano Premium, integração com o WhatsApp para envio de lembretes automáticos de consulta." }
  ];

  const plans = [
    { name: "Básico", price: { monthly: "R$ 0", annually: "R$ 0" }, period: { monthly: "/mês", annually: "/ano" }, description: "Ideal para começar", features: ["Até 4 sessões por cliente", "Agendamento básico", "Suporte por email"], highlighted: false, cta: "Acessar", planId: "basico" },
    { name: "Profissional", price: { monthly: "R$ 29,90", annually: "R$ 299,90" }, period: { monthly: "/mês", annually: "/ano" }, subtext: "equivale a R$ 24,99/mês", description: "Para profissionais em crescimento", features: ["Até 20 clientes", "Sessões ilimitadas", "Histórico básico", "Agendamento online", "Suporte prioritário"], highlighted: false, cta: "Assinar Profissional", planId: "pro" },
    { name: "Premium", price: { monthly: "R$ 59,90", annually: "R$ 599,90" }, period: { monthly: "/mês", annually: "/ano" }, subtext: "equivale a R$ 49,99/mês", description: "Máximo poder e recursos", features: ["Clientes ilimitados", "Histórico completo", "Relatórios em PDF", "Integração WhatsApp", "Backup automático"], highlighted: true, cta: "Assinar Premium", planId: "premium" }
  ]

  const handleGetStarted = (planId?: string) => {
    navigate(planId === 'basico' || !planId ? '/login' : `/upgrade?plan=${planId}`);
  };

  return (
    <div className="landing-page-wrapper">
      <header className="border-b border-border/20 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-primary">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">TherapyPro</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Instagram size={20}/></a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={20}/></a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin size={20}/></a>
              </div>
              <Button className="bg-gradient-primary hover:opacity-90" onClick={() => handleGetStarted()}>Acessar Plataforma</Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div id="inicio" className="hero-features-wrapper section-fade-mask">
          <div className="background-animation-container"><div className="blob blob-1"></div><div className="blob blob-2"></div></div>
          <section className="pt-16 pb-24 px-4 sm:px-6 lg:px-8 relative z-10 bg-transparent">
            <AnimateOnScroll className="max-w-3xl mx-auto text-center">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-relaxed pb-4"><div className="text-center">Organize seus <span className="bg-gradient-primary bg-clip-text text-transparent">{displayText}</span></div><div className="text-center">com facilidade</div></h1>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">A plataforma completa para psicólogos, psicanalistas e terapeutas gerenciarem agenda, clientes e pagamentos em um só lugar.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center"><Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 text-white shadow-primary hover:shadow-elegant transition-all" onClick={() => handleGetStarted()}>Comece a usar gratuitamente <ArrowRight className="w-5 h-5 ml-2" /></Button></div>
            </AnimateOnScroll>
          </section>

          <section id="funcionalidades" ref={sectionPinRef} className="py-16 bg-transparent relative z-10">
            <div ref={trackContainerRef} className="max-w-7xl mx-auto">
              <div className="text-center mb-16 px-4"><h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Uma plataforma, todas as ferramentas</h2><p className="text-lg text-muted-foreground max-w-2xl mx-auto">Tudo que você precisa para uma gestão profissional e eficiente.</p></div>
              
              <div className="hidden lg:flex items-center h-[500px] overflow-hidden fade-edges">
                <div ref={trackRef} className="scroll-track px-4 sm:px-6 lg:px-8">
                  {features.map((feature, index) => (
                    <div key={index} className="feature-card-large p-8 flex flex-col shadow-md">
                      <feature.icon className="icon-bg" strokeWidth={0.5} />
                      <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-primary"><feature.icon className="w-7 h-7 text-white" /></div>
                      <h3 className="text-2xl font-bold text-foreground mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* VERSÃO MOBILE COM SCROLL NATIVO */}
              <div className="block lg:hidden px-4 sm:px-6">
                <div className="flex gap-8 overflow-x-auto pb-4 scroll-track">
                  {features.map((feature, index) => (
                    <div key={index} className="feature-card-large p-8 flex flex-col h-auto shadow-md">
                      <feature.icon className="icon-bg" strokeWidth={0.5} />
                      <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-primary"><feature.icon className="w-7 h-7 text-white" /></div>
                      <h3 className="text-2xl font-bold text-foreground mb-3">{feature.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
             {/* --- BARRA DE ROLAGEM CUSTOMIZADA (DENTRO DA SEÇÃO PINADA) --- */}
            <div ref={scrollbarContainerRef} className="custom-scrollbar-container hidden lg:flex mt-8 max-w-xs mx-auto">
              <div ref={scrollbarTrackRef} className="custom-scrollbar-track">
                <div ref={scrollbarThumbRef} className="custom-scrollbar-thumb" />
              </div>
            </div>
          </section>
        </div>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <AnimateOnScroll className="max-w-7xl mx-auto marquee-container">
            <div className="text-center mb-16 space-y-4"><h2 className="text-3xl sm:text-4xl font-bold text-foreground">Criado para todos os profissionais do cuidado</h2><p className="text-lg text-muted-foreground max-w-2xl mx-auto">Desenvolvido para psicólogos, terapeutas, coaches e todos que dedicam suas vidas a ajudar os outros.</p></div>
            <div className="space-y-4">
              <div className="marquee"><div className="marquee-track">{[...professionals, ...professionals].map((prof, index) => (<div key={index} className={`marquee-item ${index % 2 === 0 ? 'dark' : 'light'}`}><prof.icon /><span>{prof.name}</span></div>))}</div></div>
              <div className="marquee"><div className="marquee-track reverse">{[...professionals.slice().reverse(), ...professionals.slice().reverse()].map((prof, index) => (<div key={index} className={`marquee-item ${index % 2 === 0 ? 'light' : 'dark'}`}><prof.icon /><span>{prof.name}</span></div>))}</div></div>
            </div>
          </AnimateOnScroll>
        </section>
        
        <section id="sistema-em-acao" className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <AnimateOnScroll className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Veja o sistema em ação</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Interface profissional e intuitiva, desenvolvida para otimizar sua prática clínica.</p>
            </AnimateOnScroll>
            <div className="space-y-16">
              <AnimateOnScroll id="dashboard" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="order-2 lg:order-1 feature-description-container">
                  <div className="icon-wrapper"><BarChart3 /></div>
                  <h3>Dashboard Inteligente</h3>
                  <p>Visualize todas as métricas importantes da sua prática em um só lugar. Acompanhe receita mensal, sessões realizadas e estatísticas de crescimento com uma clareza sem precedentes.</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3"><CheckCircle /><span>Métricas em tempo real</span></li>
                    <li className="flex items-center gap-3"><CheckCircle /><span>Gráficos de produtividade</span></li>
                  </ul>
                </div>
                <div className="order-1 lg:order-2 image-slide-container image-slide-right"><img src="/dashboard.png" alt="Dashboard do TherapyPro" /></div>
              </AnimateOnScroll>
              <AnimateOnScroll id="agenda" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="image-slide-container image-slide-left"><img src="/agenda.png" alt="Agenda do TherapyPro" /></div>
                <div className="feature-description-container">
                  <div className="icon-wrapper"><Calendar /></div>
                  <h3>Agenda Avançada</h3>
                  <p>Gerencie seus agendamentos com facilidade e precisão. Visualize por dia, semana ou mês e sincronize automaticamente com o Google Calendar para nunca perder um compromisso.</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3"><CheckCircle /><span>Arrastar e soltar para reagendar</span></li>
                    <li className="flex items-center gap-3"><CheckCircle /><span>Integração com Google Calendar</span></li>
                  </ul>
                </div>
              </AnimateOnScroll>
              <AnimateOnScroll id="clientes" className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="order-2 lg:order-1 feature-description-container">
                  <div className="icon-wrapper bg-green-100"><Users className="text-green-700" /></div>
                  <h3>Gestão Completa de Clientes</h3>
                  <p>Mantenha fichas completas com histórico detalhado de sessões e anotações clínicas. Tudo armazenado de forma segura e acessível, com total privacidade.</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3"><CheckCircle /><span>Fichas clínicas completas</span></li>
                    <li className="flex items-center gap-3"><CheckCircle /><span>Segurança e privacidade total</span></li>
                  </ul>
                </div>
                <div className="order-1 lg:order-2 image-slide-container image-slide-right"><img src="/clientes.png" alt="Gestão de clientes do TherapyPro" /></div>
              </AnimateOnScroll>
            </div>
          </div>
        </section>

        {/* --- NOVA SEÇÃO DO SLIDER --- */}
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <AnimateOnScroll className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Seu consultório, sua identidade.</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Alterne entre os temas claro e escuro e personalize as cores para deixar a plataforma com a sua cara. Uma experiência única, pensada para você.
              </p>
            </AnimateOnScroll>
            
            <AnimateOnScroll className="max-w-5xl mx-auto">
              <div className="custom-compare-slider">
                {/* Imagem de Fundo (Escuro) */}
                <div className="image-container">
                    <img src={depoisImg} alt="Dashboard no tema escuro" />
                </div>
                {/* Imagem de Cima (Claro) que será cortada */}
                <div 
                  className="image-container"
                  style={{
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                  }}
                >
                  <img src={antesImg} alt="Dashboard no tema claro" />
                </div>
                
                {/* A Linha e Ícone do Slider */}
                <div 
                  className="slider-handle"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="handle-icon">
                    <ChevronsLeftRight size={24} />
                  </div>
                </div>
                
                {/* O Input invisível que controla o efeito */}
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={sliderPosition}
                  className="slider-input"
                  onInput={(e) => setSliderPosition(Number(e.target.value))}
                />
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        <section id="depoimentos" className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <AnimateOnScroll className="max-w-7xl mx-auto">
            <div className="text-center mb-16"><h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Aprovado por quem usa todos os dias</h2><p className="text-lg text-muted-foreground max-w-2xl mx-auto">Confiança construída com resultados reais.</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="fade-in-item">
                  <div className="testimonial-card h-full">
                    <p className="text-muted-foreground mb-6 text-lg flex-grow">"{testimonial.text}"</p>
                    <div className="flex items-center gap-4">
                      <img src={testimonial.imgSrc} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                      <div><p className="font-bold text-foreground">{testimonial.name}</p><p className="text-sm text-muted-foreground">{testimonial.role}</p></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </section>

        <div id="planos" className="plans-faq-wrapper">
          <div className="background-animation-container"><div className="blob blob-3"></div><div className="blob blob-4"></div></div>
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-transparent relative z-10">
            <AnimateOnScroll className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Planos que se adaptam ao seu momento</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Comece grátis e evolua conforme sua prática cresce.</p>
                <div className="flex items-center justify-center space-x-4 mt-8">
                  <Label htmlFor="billing-cycle" className={`${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>Mensal</Label>
                  <Switch id="billing-cycle" checked={billingCycle === 'annually'} onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')} />
                  <Label htmlFor="billing-cycle" className={`${billingCycle === 'annually' ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>Anual</Label>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">Economize 2 meses</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <div key={plan.planId} className="fade-in-item">
                    <Card className={`flex flex-col h-full relative shadow-soft transition-all duration-300 ${plan.highlighted ? 'ring-2 ring-primary scale-105 shadow-primary hover:scale-110' : 'hover:-translate-y-2'}`}>
                      {plan.highlighted && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-white">Mais Popular</Badge>}
                      <CardHeader className="text-center pt-8">
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <div className="flex items-center justify-center my-4 h-16">
                          <div>
                            <span className="text-4xl font-bold">{plan.price[billingCycle]}</span>
                            <span className="text-muted-foreground ml-1">{plan.period[billingCycle]}</span>
                            {billingCycle === 'annually' && plan.subtext && <p className="text-xs text-muted-foreground mt-1">{plan.subtext}</p>}
                          </div>
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-col flex-grow p-6">
                        <ul className="space-y-3 mb-8 flex-grow">{plan.features.map((feature, i) => (<li key={i} className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" /><span className="text-sm text-muted-foreground">{feature}</span></li>))}</ul>
                        <Button className={`w-full text-base py-6 ${plan.highlighted ? 'bg-gradient-primary text-white shadow-primary' : 'bg-muted hover:bg-muted/80 text-foreground'}`} onClick={() => handleGetStarted(plan.planId)}>{plan.cta}</Button>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
              <div className="text-center mt-12">
                <Button variant="outline">Comparar planos</Button>
              </div>
            </AnimateOnScroll>
          </section>

          <section id="faq" className="py-16 px-4 sm:px-6 lg:px-8 bg-transparent relative z-10">
            <AnimateOnScroll className="max-w-3xl mx-auto">
              <div className="text-center mb-16"><h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Perguntas Frequentes</h2><p className="text-lg text-muted-foreground">Tudo que você precisa saber para começar.</p></div>
              <div className="space-y-4">{faqItems.map((item, index) => (<FaqItem key={index} question={item.question} answer={item.answer} />))}</div>
            </AnimateOnScroll>
          </section>
        </div>

        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-7xl mx-auto">
            <div className="cta-animated-background text-white">
              <AnimateOnScroll className="max-w-4xl mx-auto text-center">
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">Pronto para transformar sua prática?</h2>
                <p className="text-xl text-white/90 mb-8">Junte-se a centenas de profissionais que já otimizaram sua gestão.</p>
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90 transform hover:scale-105 transition-transform" onClick={() => handleGetStarted()}>Acessar Plataforma <ArrowRight className="w-5 h-5 ml-2" /></Button>
              </AnimateOnScroll>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between gap-8 text-center md:text-left">
            {/* Coluna da Marca */}
            <div className="space-y-4 flex flex-col items-center md:items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-primary">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-foreground">TherapyPro</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs">A plataforma completa para profissionais do cuidado.</p>
              <div className="flex space-x-4 pt-2">
                <a href="#" className="footer-social-link"><Instagram size={20} /></a>
                <a href="#" className="footer-social-link"><Twitter size={20} /></a>
                <a href="#" className="footer-social-link"><Linkedin size={20} /></a>
              </div>
            </div>

            {/* Grupo de Links da Direita */}
            <div className="flex flex-col items-center text-center gap-8 sm:flex-row sm:items-start sm:text-left sm:gap-16 md:gap-24">
              {/* Coluna de Navegação */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Navegação</h3>
                <ul className="grid grid-cols-3 gap-x-12 gap-y-3">
                  <li><a href="#inicio" className="footer-link">Início</a></li>
                  <li><a href="#planos" className="footer-link">Planos</a></li>
                  <li><a href="#dashboard" className="footer-link">Dashboard</a></li>
                  <li><a href="#funcionalidades" className="footer-link">Funcionalidades</a></li>
                  <li><a href="#faq" className="footer-link">FAQ</a></li>
                  <li><a href="#agenda" className="footer-link">Agenda</a></li>
                  <li><a href="#sistema-em-acao" className="footer-link">Sistema</a></li>
                  <li><a href="#depoimentos" className="footer-link">Depoimentos</a></li>
                  <li><a href="#clientes" className="footer-link">Clientes</a></li>
                </ul>
              </div>

              {/* Coluna Legal e Suporte */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground tracking-wider uppercase">Recursos</h3>
                <ul className="space-y-3">
                  <li><a href="https://wa.me/5511945539883" target="_blank" rel="noopener noreferrer" className="footer-link">Suporte</a></li>
                  <li><a href="/termos" className="footer-link">Termos de Serviço</a></li>
                  <li><a href="/privacidade" className="footer-link">Política de Privacidade</a></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Linha de Copyright Definitiva */}
          <div className="mt-16 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
            <p className="m-0">© 2025 TherapyPro</p>
            <p className="m-0">Todos os direitos reservados.</p>
          </div>

        </div>
      </footer>
      
      <CookieNotice />
    </div>
  )
}

export default LandingPage