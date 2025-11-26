import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Stethoscope, Calendar, Users, DollarSign, TrendingUp,
  CheckCircle, ArrowRight, Brain, Heart, Shield, Clock,
  GraduationCap, Target, BookOpen, Activity, BarChart3,
  MessageCircle, ChevronDown, Lock, Mail, Globe, BarChart,
  Gift, ChevronsLeftRight, Instagram, Linkedin, Twitter,
  Sparkles, ChevronsRight, Mouse,
  Play, Pause, Volume2, VolumeX,
  Database, ShieldCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useColorTheme } from "@/hooks/useColorTheme";
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { CookieNotice } from "@/components/CookieNotice";

import antesImg from '../assets/antes.webp';
import depoisImg from '../assets/depois.webp';
import supabaseLogo from '../assets/supabase_logo.webp';
import stripeLogo from '../assets/stripe_logo.webp';
import googleLogo from '../assets/google_logo.webp';
import cloudflareLogo from '../assets/cloudflare_logo.webp';


import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { Flip } from "gsap/Flip";

import "./LandingPage.styles.css";

// --- INÍCIO: CORREÇÃO DE TIPAGEM DO TYPESCRIPT ---
// Este bloco avisa ao TypeScript sobre o objeto YT e a função da API do YouTube na window.
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}
// --- FIM: CORREÇÃO DE TIPAGEM DO TYPESCRIPT ---


// --- HOOKS E COMPONENTES AUXILIARES ---

const useIntersectionObserver = (options: IntersectionObserverInit) => {
  const [elementRef, setElementRef] = useState<Element | null>(null);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);
    if (elementRef) observer.observe(elementRef);
    return () => { if (elementRef) observer.unobserve(elementRef) };
  }, [elementRef, options]);

  return [setElementRef, entry] as const;
};


const AnimateOnScroll = ({ children, className = '', id = '' }: any) => {
  const [ref, entry] = useIntersectionObserver({ threshold: 0.1 });
  const isVisible = entry?.isIntersecting;
  return (
    <div ref={ref} id={id} className={`${className} fade-in-section ${isVisible ? 'is-visible' : ''}`}>
      {children}
    </div>
  );
};

const FaqItem = ({ question, answer }: any) => {
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
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin); 

  const navigate = useNavigate();
  const { resetToDefaultColors } = useColorTheme();
  const [displayText, setDisplayText] = useState("");
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [waitingToDelete, setWaitingToDelete] = useState(false);
  const words = ["atendimentos", "agendamentos", "ganhos", "clientes"];
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annually'>('monthly');

  const [sliderPosition, setSliderPosition] = useState(50);

  const sectionPinRef = useRef(null);
  const trackRef = useRef(null);
  const stackingPinRef = useRef(null);
  
  const playerRef = useRef<any>(null);
  const [videoContainerRef, videoEntry] = useIntersectionObserver({ threshold: 0.5 });
  const videoId = "_nGgpa5NLOg";
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState("0:00");
  const [currentTime, setCurrentTime] = useState("0:00");
  
  const [userHasPaused, setUserHasPaused] = useState(false);

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    const onYouTubeIframeAPIReady = () => {
      if (playerRef.current) return;
      
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: videoId,
        playerVars: {
          autoplay: 0, controls: 0, mute: 1, loop: 1,
          playlist: videoId, showinfo: 0, modestbranding: 1, rel: 0
        },
        events: {
          'onReady': (event: any) => {
            event.target.mute();
            setDuration(formatTime(event.target.getDuration()));
            setIsPlayerReady(true);
          },
          'onStateChange': (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      onYouTubeIframeAPIReady();
    } else {
      window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
      const script = document.getElementById('youtube-iframe-api');
      if (!script) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        tag.id = 'youtube-iframe-api';
        
        // Método mais seguro: adicionar ao head ou body diretamente
        const targetElement = document.head || document.body;
        if (targetElement) {
          targetElement.appendChild(tag);
        } else {
          console.error('Não foi possível adicionar script do YouTube: DOM não disponível');
        }
      }
    }
  }, []);
  
  useEffect(() => {
    const player = playerRef.current;
    if (isPlayerReady && player) {
      if (videoEntry?.isIntersecting) {
        if (!userHasPaused) {
          player.playVideo();
        }
      } else {
        player.pauseVideo();
      }
    }
  }, [videoEntry, isPlayerReady, userHasPaused]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && isPlayerReady) {
      interval = setInterval(() => {
        const player = playerRef.current;
        const currentTimeVal = player.getCurrentTime();
        const durationVal = player.getDuration();
        if (durationVal > 0) {
          setProgress((currentTimeVal / durationVal) * 100);
          setCurrentTime(formatTime(currentTimeVal));
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isPlayerReady]);
  
  const handlePlayPause = () => {
    if (!isPlayerReady) return;
    if (isPlaying) {
      playerRef.current?.pauseVideo();
      setUserHasPaused(true);
    } else {
      playerRef.current?.playVideo();
      setUserHasPaused(false);
    }
  };

  const handleMuteToggle = () => {
    if (!isPlayerReady) return;
    if (isMuted) {
      playerRef.current?.unMute();
      setIsMuted(false);
    } else {
      playerRef.current?.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPlayerReady) return;
    const newProgress = Number(e.target.value);
    setProgress(newProgress);
    const durationVal = playerRef.current.getDuration();
    const seekToTime = (durationVal * newProgress) / 100;
    playerRef.current.seekTo(seekToTime);
  };


  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.style.colorScheme = 'light';
    resetToDefaultColors();
    return () => { document.body.style.colorScheme = '' };
  }, [resetToDefaultColors]);

  useEffect(() => {
    const word = words[currentWordIndex];
    let timeout: NodeJS.Timeout;
    if (waitingToDelete) {
      timeout = setTimeout(() => { setWaitingToDelete(false); setIsDeleting(true); }, 2000);
    } else if (isDeleting) {
      if (currentCharIndex > 0) {
        timeout = setTimeout(() => { setCurrentCharIndex(prev => prev - 1); setDisplayText(word.substring(0, currentCharIndex - 1)); }, 75);
      } else {
        setIsDeleting(false); setCurrentWordIndex(prev => (prev + 1) % words.length);
      }
    } else {
      if (currentCharIndex < word.length) {
        timeout = setTimeout(() => { setCurrentCharIndex(prev => prev + 1); setDisplayText(word.substring(0, currentCharIndex + 1)); }, 150);
      } else if (!waitingToDelete) {
        setWaitingToDelete(true);
      }
    }
    return () => clearTimeout(timeout);
  }, [currentCharIndex, currentWordIndex, isDeleting, waitingToDelete]);
  
  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    if (!mediaQuery.matches) return;
  
    let ctx = gsap.context(() => {
      const track = trackRef.current;
      if (!track) return;
      
      const allCards = gsap.utils.toArray<HTMLElement>(".feature-card-large");
      if (allCards.length < 2) return;
      
      const featureCards = allCards.slice(1, -1);

      const cardWidth = 320;
      const gap = 32;
      const offset = cardWidth + gap;
      
      const totalScroll = track.scrollWidth - window.innerWidth;
      const animationDistance = totalScroll - (2 * offset);

      gsap.fromTo(track,
        {
          x: -offset
        },
        {
          x: -(totalScroll - offset),
          ease: "none",
          scrollTrigger: {
            trigger: sectionPinRef.current,
            pin: true,
            scrub: 1.8,
            start: `top top`,
            end: () => `+=${animationDistance}`,
            invalidateOnRefresh: true,
            onUpdate: (self: any) => {
              const viewportCenter = window.innerWidth / 2;
              
              featureCards.forEach((card) => {
                const cardRect = card.getBoundingClientRect();
                const cardCenter = cardRect.left + cardRect.width / 2;
                const distanceFromCenter = Math.abs(viewportCenter - cardCenter);
                const scale = gsap.utils.mapRange(0, window.innerWidth / 2, 1.1, 0.8, distanceFromCenter);
                gsap.to(card, { scale: scale, ease: "power1.out", duration: 0.5 });
              });

              gsap.to(allCards[0], { scale: 0.8, ease: "power1.out", duration: 0.5 });
              gsap.to(allCards[allCards.length - 1], { scale: 0.8, ease: "power1.out", duration: 0.5 });
            },
          },
        }
      );
      
      ScrollTrigger.refresh();

    }, sectionPinRef);
  
    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const pinEl = stackingPinRef.current;
    if (!pinEl) return;
    
    const cards = gsap.utils.toArray<HTMLElement>(".stacking-card");
    if (cards.length === 0) return;
    
    let ctx = gsap.context(() => {
      gsap.set(cards[0], { yPercent: 0, opacity: 1 });
      gsap.set(cards.slice(1), { yPercent: 100, opacity: 0 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: pinEl,
          pin: true,
          start: "top top",
          end: "+=1200",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
      
      timeline.to({}, { duration: 0.2 });

      timeline.to(cards[0], {
        scale: 0.90, 
        yPercent: -10, 
        ease: "power2.inOut"
      });
      timeline.to(cards[1], {
        yPercent: 0,
        opacity: 1,
        ease: "power2.inOut"
      }, "<"); 

      timeline.to({}, { duration: 0.2 });
      
      timeline.to(cards[1], {
        scale: 0.95, 
        yPercent: -5, 
        ease: "power2.inOut"
      });
      timeline.to(cards[2], {
        yPercent: 0,
        opacity: 1,
        ease: "power2.inOut"
      }, "<");

    }, stackingPinRef);
    
    return () => ctx.revert();
  }, []);

  const handleScrollToFeatures = () => {
    gsap.to(window, { duration: 1.2, scrollTo: "#funcionalidades", ease: "power2.inOut" });
  };


  const features = [
    { icon: Globe, title: "Página Pública", description: "Crie uma página profissional para que novos clientes possam te encontrar e agendar uma consulta." },
    { icon: Calendar, title: "Agendamento Inteligente", description: "Otimize sua rotina com uma agenda clara, evitando conflitos e maximizando seu tempo." },
    { icon: Users, title: "Gestão de Clientes", description: "Centralize informações, histórico e progresso dos pacientes em um prontuário seguro e de fácil acesso." },
    { icon: DollarSign, title: "Controle Financeiro", description: "Acompanhe pagamentos, despesas e sua receita de forma automatizada e sem complicações." },
    { icon: BarChart, title: "Metas e Evolução", description: "Acompanhe o progresso dos seus clientes com gráficos e anotações de evolução." },
    { icon: Lock, title: "Prontuários Seguros", description: "Dados criptografados e em conformidade com as normas de segurança para sua tranquilidade." },
  ];

  const professionals = [
    { name: "Psicólogos", icon: Brain }, { name: "Psicanalistas", icon: BookOpen }, { name: "Terapeutas", icon: Heart },
    { name: "Coaches", icon: Target }, { name: "Psiquiatras", icon: Activity }, { name: "Terapeutas Ocupacionais", icon: GraduationCap },
    { name: "Consultores", icon: MessageCircle }, { name: "Mentores", icon: Shield },
  ];
  
  const testimonials = [
    { name: "Dr. Ana Costa", role: "Psicóloga Clínica", text: "O TherapyPro revolucionou a gestão do meu consultório. Agora tenho mais tempo para focar no que realmente importa: meus pacientes.", imgSrc: "https://i.pravatar.cc/150?img=1" },
    { name: "Juliana Pereira", role: "Terapeuta Ocupacional", text: "Excelente ferramenta! A gestão de agendamentos e o histórico de clientes são funcionalidades que me economizam horas toda semana.", imgSrc: "https://i.pravatar.cc/150?img=26" },
    { name: "Carlos Martins", role: "Psicanalista", text: "A plataforma é intuitiva, segura e completa. Os relatórios financeiros me deram uma visão clara do crescimento da minha prática.", imgSrc: "https://i.pravatar.cc/150?img=33" },
    { name: "Dr. Ricardo Souza", role: "Psiquiatra", text: "A segurança dos prontuários era minha maior preocupação. Com o TherapyPro, sinto total confiança na proteção dos dados dos meus pacientes.", imgSrc: "https://i.pravatar.cc/150?img=68" },
    { name: "Mariana Lima", role: "Coach de Carreira", text: "Uso para gerenciar meus clientes e pagamentos. É simples, direto e muito eficiente. Recomendo!", imgSrc: "https://i.pravatar.cc/150?img=49" },
    { name: "Fernando Guimarães", role: "Terapeuta Holístico", text: "O suporte é incrível e a plataforma está sempre evoluindo. Sinto que minhas sugestões são ouvidas.", imgSrc: "https://i.pravatar.cc/150?img=53" },
  ];
  
  const faqItems = [
    { question: "O TherapyPro é seguro para os dados dos meus pacientes?", answer: "Sim. A segurança é nossa prioridade máxima. Utilizamos criptografia de ponta para proteger todos os dados e seguimos as melhores práticas de segurança, em conformidade com as normas de proteção de dados." },
    { question: "Posso testar a plataforma antes de assinar?", answer: "Com certeza! Oferecemos um plano Básico totalmente gratuito, ideal para você começar e conhecer as principais funcionalidades. Você pode fazer o upgrade para um plano superior a qualquer momento." },
    { question: "Como funciona o suporte ao cliente?", answer: "Oferecemos suporte humano e personalizado. Nos planos Profissional e Premium, você tem acesso a suporte prioritário por e-mail e chat para garantir que qualquer dúvida seja resolvida rapidamente." },
    { question: "A plataforma se integra com outras ferramentas?", answer: "Sim. O TherapyPro oferece integração com o Google Calendar para sincronização de agenda e, no plano Premium, integração com o WhatsApp para envio de lembretes automáticos de consulta." }
  ];

  const plans = [
    { name: "Básico", price: { monthly: "R$ 0", annually: "R$ 0" }, period: { monthly: "/mês", annually: "/ano" }, description: "Ideal para começar", features: ["Até 4 sessões por cliente", "Agendamento básico", "Suporte por email"], highlighted: false, cta: "Acessar", planId: "basico" },
    { name: "Profissional", price: { monthly: "R$ 29,90", annually: "R$ 24,90" }, period: { monthly: "/mês", annually: "/mês" }, subtext: "12x R$ 24,90 = R$ 298,80/ano", description: "Para profissionais em crescimento", features: ["Até 20 clientes", "Sessões ilimitadas", "Histórico básico", "Agendamento online", "Suporte prioritário"], highlighted: false, cta: "Assinar Profissional", planId: "pro" },
    { name: "Premium", price: { monthly: "R$ 49,90", annually: "R$ 41,58" }, period: { monthly: "/mês", annually: "/mês" }, subtext: "12x R$ 41,58 = R$ 498,96/ano", description: "Máximo poder e recursos", features: ["Clientes ilimitados", "Histórico completo", "Relatórios em PDF", "Integração WhatsApp", "Backup automático"], highlighted: true, cta: "Assinar Premium", planId: "premium" }
  ];

  const systemInActionFeatures = [
    {
      icon: BarChart3,
      title: "Dashboard Inteligente",
      description: "Visualize todas as métricas importantes da sua prática em um só lugar. Acompanhe receita mensal, sessões realizadas e estatísticas de crescimento com uma clareza sem precedentes.",
      features: ["Métricas em tempo real", "Gráficos de produtividade"],
    },
    {
      icon: Calendar,
      title: "Agenda Avançada",
      description: "Gerencie seus agendamentos com facilidade e precisão. Visualize por dia, semana ou mês e sincronize automaticamente com o Google Calendar para nunca perder um compromisso.",
      features: ["Arrastar e soltar para reagendar", "Integração com Google Calendar"],
    },
    {
      icon: Users,
      title: "Gestão Completa de Clientes",
      description: "Mantenha fichas completas com histórico detalhado de sessões e anotações clínicas. Tudo armazenado de forma segura e acessível, com total privacidade.",
      features: ["Fichas clínicas completas", "Segurança e privacidade total"],
    }
  ];

  const handleGetStarted = (planId?: string) => {
    const params = new URLSearchParams();
    params.set('tab', 'register');
    if (planId && planId !== 'basico') {
      params.set('plan', planId);
      params.set('billing', billingCycle);
    }
    navigate(`/login?${params.toString()}`);
  };

  const techLogoStyle = {
    height: '36px',
    width: 'auto',
    opacity: '0.2',
    filter: 'grayscale(100%)'
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
              <Button className="bg-gradient-primary hover:opacity-90" onClick={() => navigate('/login')}>Acessar Plataforma</Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="home-video-wrapper">
          <div className="background-animation-container">
            <div className="blob blob-1"></div>
          </div>

          <div id="inicio" className="hero-features-wrapper">
            <section className="min-h-screen flex flex-col justify-center pb-24 px-4 sm:px-6 lg:px-8 relative z-10 bg-transparent">
              <AnimateOnScroll className="max-w-3xl mx-auto text-center">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-relaxed pb-4"><div className="text-center">Organize seus <span className="bg-gradient-primary bg-clip-text text-transparent">{displayText}</span></div><div className="text-center">com facilidade</div></h1>
                <p className="text-xl text-muted-foreground mb-10 leading-relaxed">A plataforma completa para psicólogos, psicanalistas e terapeutas gerenciarem agenda, clientes e pagamentos em um só lugar.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 text-white shadow-primary hover:shadow-elegant transition-all" onClick={() => handleGetStarted()}>Comece a usar gratuitamente <ArrowRight className="w-5 h-5 ml-2" /></Button>
                </div>

                <Mouse className="scroll-down-mouse mt-20" />

              </AnimateOnScroll>
            </section>
          </div>

          <section id="video-apresentacao" className="bg-background">
            <div className="max-w-5xl mx-auto text-center">
              <div ref={videoContainerRef} className="video-player-container">
                <div id="youtube-player"></div>
                <div className="video-click-overlay" onClick={handlePlayPause}></div>
                <div className="video-controls">
                  <button onClick={handlePlayPause} className="control-button">
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <span className="time-display">{currentTime}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={progress}
                    onInput={handleSeek}
                    className="progress-bar"
                  />
                  <span className="time-display">{duration}</span>
                  <button onClick={handleMuteToggle} className="control-button">
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </div>
              </div>
              
              <div className="mt-20">
                <div className="tech-logos">
                  <div className="flex justify-center items-center gap-8 md:gap-12">
                    <img src={googleLogo} alt="Google" style={techLogoStyle} />
                    <img src={stripeLogo} alt="Stripe" style={techLogoStyle} />
                    <img src={supabaseLogo} alt="Supabase" style={techLogoStyle} />
                    <img src={cloudflareLogo} alt="Cloudflare" style={techLogoStyle} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section id="funcionalidades" ref={sectionPinRef} className="py-16 bg-background relative h-[100vh] flex flex-col justify-center">
          <div className="max-w-7xl mx-auto w-full text-center mb-16 px-4 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Uma plataforma, todas as ferramentas</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Tudo que você precisa para uma gestão profissional e eficiente.</p>
          </div>
          
          <div className="relative w-full h-[450px] flex items-center">
            <div className="center-highlight-outline"></div>

            <div className="hidden lg:flex items-center h-full w-full fade-edges overflow-hidden">
              <div ref={trackRef} className="scroll-track">
                
                <div className="feature-card-large scroll-placeholder-card">
                  <ChevronsRight className="w-10 h-10 mb-4 text-muted-foreground/50" />
                  <h3 className="text-xl font-medium text-muted-foreground">Deslize para descobrir</h3>
                </div>

                {features.map((feature, index) => (
                  <div key={index} className="feature-card-large p-8 flex flex-col shadow-md">
                    <feature.icon className="icon-bg" strokeWidth={0.5} />
                    <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mb-6 shadow-primary"><feature.icon className="w-7 h-7 text-white" /></div>
                    <h3 className="text-2xl font-bold text-foreground mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                ))}

                <div className="feature-card-large scroll-placeholder-card">
                  <Sparkles className="w-10 h-10 mb-4 text-muted-foreground/50" />
                  <h3 className="text-xl font-medium text-muted-foreground">E muito mais por vir...</h3>
                </div>

              </div>
            </div>

            <div className="block lg:hidden px-4 sm:px-6">
              <div className="flex gap-8 overflow-x-auto pb-4 scroll-track-mobile">
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
        </section>
        
        <section className="py-16 bg-background">
          <AnimateOnScroll>
            <div className="text-center mb-16 space-y-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">Criado para todos os profissionais do cuidado</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Desenvolvido para psicólogos, terapeutas, coaches e todos que dedicam suas vidas a ajudar os outros.</p>
            </div>
            <div className="marquee-container">
              <div className="space-y-4">
                <div className="marquee"><div className="marquee-track">{[...professionals, ...professionals].map((prof, index) => (<div key={index} className={`marquee-item ${index % 2 === 0 ? 'dark' : 'light'}`}><prof.icon /><span>{prof.name}</span></div>))}</div></div>
                <div className="marquee"><div className="marquee-track reverse">{[...professionals.slice().reverse(), ...professionals.slice().reverse()].map((prof, index) => (<div key={index} className={`marquee-item ${index % 2 === 0 ? 'light' : 'dark'}`}><prof.icon /><span>{prof.name}</span></div>))}</div></div>
              </div>
            </div>
          </AnimateOnScroll>
        </section>
        
        <section id="sistema-em-acao" className="sistema-em-acao-section">
          <div ref={stackingPinRef} className="stacking-container">
            <div className="stacking-title">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Veja o sistema em ação</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">Interface profissional e intuitiva, desenvolvida para otimizar sua prática clínica.</p>
            </div>
            
            <div className="cards-wrapper">
              {systemInActionFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="stacking-card">
                    <div className="icon-wrapper"><Icon /></div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                    <ul className="space-y-3">
                      {feature.features.map((item, i) => (
                        <li key={i}><CheckCircle /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

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
                <div className="image-container">
                    <img src={depoisImg} alt="Dashboard no tema escuro" />
                </div>
                <div 
                  className="image-container"
                  style={{
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                  }}
                >
                  <img src={antesImg} alt="Dashboard no tema claro" />
                </div>
                
                <div 
                  className="slider-handle"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="handle-icon">
                    <ChevronsLeftRight size={24} />
                  </div>
                </div>
                
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={sliderPosition}
                  className="slider-input"
                  onInput={(e) => setSliderPosition(Number((e.target as HTMLInputElement).value))}
                />
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        <section id="depoimentos" className="py-16 px-4 sm:px-6 lg:px-8 bg-background relative">
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
          <section className="py-16 px-4 sm:px-6 lg:px-8 bg-transparent relative z-10">
            <AnimateOnScroll className="max-w-5xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Planos que se adaptam ao seu momento</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Comece grátis e evolua conforme sua prática cresce.</p>
                <div className="flex items-center justify-center space-x-4 mt-8">
                  <Label htmlFor="billing-cycle" className={`${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>Mensal</Label>
                  <Switch id="billing-cycle" checked={billingCycle === 'annually'} onCheckedChange={(checked) => setBillingCycle(checked ? 'annually' : 'monthly')} />
                  <Label htmlFor="billing-cycle" className={`${billingCycle === 'annually' ? 'text-foreground' : 'text-muted-foreground'} transition-colors`}>Anual</Label>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 transition-colors hover:bg-green-700 hover:text-white">Economize 2 meses</Badge>
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
                <Button variant="outline" className="text-base px-8 py-3 h-auto">Comparar planos</Button>
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
          
          <div className="footer-top-section">
            <div className="footer-newsletter">
              <h3 className="text-lg font-semibold text-foreground">Fique por dentro das novidades</h3>
              <p className="text-sm text-muted-foreground mt-2">Receba dicas e atualizações para otimizar sua prática profissional.</p>
              <div className="footer-newsletter-form mt-4">
                <input type="email" placeholder="Seu melhor e-mail" className="footer-newsletter-input" />
                <Button size="icon" className="footer-newsletter-button rounded-full">
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="py-8 mb-8 border-b border-border/50 flex flex-col items-center gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-primary">
                    <Stethoscope className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold text-foreground">TherapyPro</span>
              </div>
              <p className="text-muted-foreground text-sm max-w-xs mt-4">
                  A plataforma completa para profissionais do cuidado.
              </p>
            </div>
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              <li><a href="https://wa.me/5511945539883" target="_blank" rel="noopener noreferrer" className="footer-link">Suporte</a></li>
              <li><a href="/termos" className="footer-link">Termos de Serviço</a></li>
              <li><a href="/privacidade" className="footer-link">Política de Privacidade</a></li>
            </ul>
          </div>

          <div className="footer-bottom-bar">
            <p className="text-xs text-muted-foreground">© 2025 TherapyPro. Todos os direitos reservados.</p>
            
            <div className="footer-security-tags">
              <div className="security-tag">
                <Lock size={14} />
                <span>Conexão Segura SSL</span>
              </div>
              <div className="security-tag">
                <ShieldCheck size={14} />
                <span>Pagamentos por Stripe</span>
              </div>
              <div className="security-tag">
                <Database size={14} />
                <span>Hospedado na Supabase</span>
              </div>
              <div className="security-tag">
                <BookOpen size={14} />
                <span>Conformidade LGPD</span>
              </div>
            </div>

            <div className="flex space-x-4">
              <a href="#" className="footer-social-link"><Instagram size={20} /></a>
              <a href="#" className="footer-social-link"><Twitter size={20} /></a>
              <a href="#" className="footer-social-link"><Linkedin size={20} /></a>
            </div>
          </div>

        </div>
      </footer>
      
      <CookieNotice />
    </div>
  )
}

export default LandingPage