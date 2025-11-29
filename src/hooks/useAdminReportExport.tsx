import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { format } from "date-fns";

export const useAdminReportExport = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePaymentsReport = (
    payments: any[],
    stats: any,
    filters?: { startDate?: string; endDate?: string; status?: string }
  ) => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text("Relatório de Pagamentos", 14, 20);

      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

      // Filters info
      if (filters?.startDate || filters?.endDate) {
        doc.text(
          `Período: ${filters.startDate ? format(new Date(filters.startDate), "dd/MM/yyyy") : "N/A"} - ${
            filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy") : "N/A"
          }`,
          14,
          34
        );
      }
      if (filters?.status) {
        doc.text(`Status: ${filters.status}`, 14, 40);
      }

      // Stats Summary
      doc.setFontSize(12);
      doc.text("Resumo Financeiro", 14, filters?.status ? 48 : 42);

      const summaryData = [
        ["Receita Total", `R$ ${stats.total_revenue?.toFixed(2) || "0.00"}`],
        ["Valor Médio", `R$ ${stats.average_value?.toFixed(2) || "0.00"}`],
        ["Pagamentos Confirmados", stats.paid_count?.toString() || "0"],
        ["Pagamentos Pendentes", stats.pending_count?.toString() || "0"],
        ["Pagamentos Atrasados", stats.overdue_count?.toString() || "0"],
      ];

      autoTable(doc, {
        startY: filters?.status ? 52 : 46,
        head: [["Métrica", "Valor"]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });

      // Payments Table
      doc.setFontSize(12);
      const finalY = (doc as any).lastAutoTable.finalY || 80;
      doc.text("Histórico de Pagamentos", 14, finalY + 10);

      const tableData = payments.map((p) => [
        format(new Date(p.created_at), "dd/MM/yyyy"),
        p.client?.nome || "N/A",
        p.user?.nome || "N/A",
        `R$ ${p.valor?.toFixed(2)}`,
        p.metodo_pagamento || "N/A",
        p.status || "N/A",
      ]);

      autoTable(doc, {
        startY: finalY + 14,
        head: [["Data", "Cliente", "Profissional", "Valor", "Método", "Status"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 8 },
      });

      doc.save(`relatorio-pagamentos-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Relatório de pagamentos exportado com sucesso!");
    } catch (error) {
      console.error("Error generating payments report:", error);
      toast.error("Erro ao gerar relatório de pagamentos");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAnalyticsReport = (
    analytics: any,
    filters?: { startDate?: string; endDate?: string }
  ) => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text("Relatório de Analytics", 14, 20);

      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
      doc.text(`Google Analytics ID: ${analytics.ga_property_id || "N/A"}`, 14, 34);

      // Filters info
      if (filters?.startDate || filters?.endDate) {
        doc.text(
          `Período: ${filters.startDate ? format(new Date(filters.startDate), "dd/MM/yyyy") : "N/A"} - ${
            filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy") : "N/A"
          }`,
          14,
          40
        );
      }

      // Database Stats
      doc.setFontSize(12);
      doc.text("Estatísticas do Sistema", 14, 48);

      const statsData = [
        ["Total de Usuários", analytics.database_stats?.total_users?.toString() || "0"],
        ["Total de Sessões", analytics.database_stats?.total_sessions?.toString() || "0"],
        ["Total de Clientes", analytics.database_stats?.total_clients?.toString() || "0"],
        ["Total de Pagamentos", analytics.database_stats?.total_payments?.toString() || "0"],
      ];

      autoTable(doc, {
        startY: 52,
        head: [["Métrica", "Valor"]],
        body: statsData,
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94] },
      });

      // Recent Activity
      const finalY = (doc as any).lastAutoTable.finalY || 90;
      doc.setFontSize(12);
      doc.text("Atividade Recente (Últimos 30 dias)", 14, finalY + 10);

      const activityData = [
        ["Novos Usuários", analytics.recent_activity?.new_users_30d?.toString() || "0"],
        ["Sessões Realizadas", analytics.recent_activity?.sessions_completed_30d?.toString() || "0"],
        [
          "Receita",
          `R$ ${analytics.recent_activity?.revenue_30d?.toFixed(2) || "0.00"}`,
        ],
      ];

      autoTable(doc, {
        startY: finalY + 14,
        head: [["Métrica", "Valor"]],
        body: activityData,
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94] },
      });

      doc.save(`relatorio-analytics-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Relatório de analytics exportado com sucesso!");
    } catch (error) {
      console.error("Error generating analytics report:", error);
      toast.error("Erro ao gerar relatório de analytics");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLogsReport = (
    logs: { auditLogs: any[]; medicalLogs: any[]; adminSessions: any[] },
    stats: any,
    filters?: { startDate?: string; endDate?: string; category?: string }
  ) => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text("Relatório de Logs e Auditoria", 14, 20);

      doc.setFontSize(10);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);

      // Filters info
      if (filters?.startDate || filters?.endDate) {
        doc.text(
          `Período: ${filters.startDate ? format(new Date(filters.startDate), "dd/MM/yyyy") : "N/A"} - ${
            filters.endDate ? format(new Date(filters.endDate), "dd/MM/yyyy") : "N/A"
          }`,
          14,
          34
        );
      }
      if (filters?.category) {
        doc.text(`Categoria: ${filters.category}`, 14, 40);
      }

      // Stats Summary
      doc.setFontSize(12);
      doc.text("Resumo de Segurança", 14, filters?.category ? 48 : 42);

      const summaryData = [
        ["Total de Logs de Auditoria", stats.total_audit_logs?.toString() || "0"],
        ["Acessos a Dados Médicos", stats.total_medical_logs?.toString() || "0"],
        ["Sessões Admin Ativas", stats.active_admin_sessions?.toString() || "0"],
        ["Tentativas Não Autorizadas", stats.unauthorized_attempts?.toString() || "0"],
      ];

      autoTable(doc, {
        startY: filters?.category ? 52 : 46,
        head: [["Métrica", "Valor"]],
        body: summaryData,
        theme: "grid",
        headStyles: { fillColor: [239, 68, 68] },
      });

      let currentY = (doc as any).lastAutoTable.finalY || 90;

      // Audit Logs (if category matches or no filter)
      if (!filters?.category || filters.category === "audit") {
        doc.setFontSize(12);
        doc.text("Logs de Auditoria (Últimos 20)", 14, currentY + 10);

        const auditData = logs.auditLogs.slice(0, 20).map((log) => [
          format(new Date(log.created_at), "dd/MM/yyyy HH:mm"),
          log.action || "N/A",
          log.table_name || "N/A",
          log.record_id?.slice(0, 8) || "N/A",
        ]);

        autoTable(doc, {
          startY: currentY + 14,
          head: [["Data/Hora", "Ação", "Tabela", "ID Registro"]],
          body: auditData,
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 8 },
        });

        currentY = (doc as any).lastAutoTable.finalY || currentY + 40;
      }

      // Medical Logs (if category matches or no filter)
      if ((!filters?.category || filters.category === "medical") && currentY < 250) {
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(12);
        doc.text("Logs de Acesso Médico (Últimos 20)", 14, currentY + 10);

        const medicalData = logs.medicalLogs.slice(0, 20).map((log) => [
          format(new Date(log.access_timestamp), "dd/MM/yyyy HH:mm"),
          log.action || "N/A",
          log.field_accessed || "N/A",
          log.action.includes("UNAUTHORIZED") ? "Bloqueado" : "Permitido",
        ]);

        autoTable(doc, {
          startY: currentY + 14,
          head: [["Data/Hora", "Ação", "Campo", "Status"]],
          body: medicalData,
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 8 },
        });
      }

      doc.save(`relatorio-logs-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Relatório de logs exportado com sucesso!");
    } catch (error) {
      console.error("Error generating logs report:", error);
      toast.error("Erro ao gerar relatório de logs");
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generatePaymentsReport,
    generateAnalyticsReport,
    generateLogsReport,
    isGenerating,
  };
};
