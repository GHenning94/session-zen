import { supabase } from '@/integrations/supabase/client';

/**
 * Recalculates sessoes_consumidas for a package based on actual sessions with status 'realizada'
 * @param packageId - The package ID to recalculate
 */
export async function recalculatePackageConsumption(packageId: string): Promise<void> {
  try {
    // Count sessions with status 'realizada' for this package
    const { data: realizedSessions, error: countError } = await supabase
      .from('sessions')
      .select('id')
      .eq('package_id', packageId)
      .eq('status', 'realizada');
    
    if (countError) {
      console.error('Error counting realized sessions:', countError);
      return;
    }

    const consumedCount = realizedSessions?.length || 0;
    
    // Get package total to determine status
    const { data: pkgData, error: pkgError } = await supabase
      .from('packages')
      .select('total_sessoes, status')
      .eq('id', packageId)
      .single();
    
    if (pkgError) {
      console.error('Error fetching package:', pkgError);
      return;
    }

    // Only update status if package is not cancelled
    let newStatus = pkgData.status;
    if (pkgData.status !== 'cancelado') {
      newStatus = consumedCount >= pkgData.total_sessoes ? 'concluido' : 'ativo';
    }
    
    // Update package
    const { error: updateError } = await supabase
      .from('packages')
      .update({ 
        sessoes_consumidas: consumedCount,
        status: newStatus
      })
      .eq('id', packageId);

    if (updateError) {
      console.error('Error updating package consumption:', updateError);
    }
  } catch (error) {
    console.error('Error in recalculatePackageConsumption:', error);
  }
}

/**
 * Recalculates sessoes_consumidas for multiple packages
 * @param packageIds - Array of package IDs to recalculate
 */
export async function recalculateMultiplePackages(packageIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(packageIds.filter(Boolean))];
  
  await Promise.all(
    uniqueIds.map(id => recalculatePackageConsumption(id))
  );
  
  // Dispatch event to notify other components
  window.dispatchEvent(new Event('packageUpdated'));
}
