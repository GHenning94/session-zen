import { supabase } from '@/integrations/supabase/client';

/**
 * Recalculates sessoes_consumidas for a package based on actual sessions with status 'realizada'
 * @param packageId - The package ID to recalculate
 * @returns Promise<boolean> - true if successful, false otherwise
 */
export async function recalculatePackageConsumption(packageId: string): Promise<boolean> {
  if (!packageId) {
    console.warn('recalculatePackageConsumption called with empty packageId');
    return false;
  }
  
  try {
    console.log(`[PackageUtils] Recalculating package: ${packageId}`);
    
    // Count sessions with status 'realizada' for this package
    const { data: realizedSessions, error: countError } = await supabase
      .from('sessions')
      .select('id')
      .eq('package_id', packageId)
      .eq('status', 'realizada');
    
    if (countError) {
      console.error('[PackageUtils] Error counting realized sessions:', countError);
      return false;
    }

    const consumedCount = realizedSessions?.length || 0;
    console.log(`[PackageUtils] Package ${packageId}: found ${consumedCount} realized sessions`);
    
    // Get package total to determine status
    const { data: pkgData, error: pkgError } = await supabase
      .from('packages')
      .select('total_sessoes, status, sessoes_consumidas')
      .eq('id', packageId)
      .single();
    
    if (pkgError) {
      console.error('[PackageUtils] Error fetching package:', pkgError);
      return false;
    }

    console.log(`[PackageUtils] Package ${packageId}: current sessoes_consumidas=${pkgData.sessoes_consumidas}, will update to ${consumedCount}`);

    // Only update status if package is not cancelled
    let newStatus = pkgData.status;
    if (pkgData.status !== 'cancelado') {
      newStatus = consumedCount >= pkgData.total_sessoes ? 'concluido' : 'ativo';
    }
    
    // Update package
    const { data: updateData, error: updateError } = await supabase
      .from('packages')
      .update({ 
        sessoes_consumidas: consumedCount,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', packageId)
      .select();

    if (updateError) {
      console.error('[PackageUtils] Error updating package consumption:', updateError);
      return false;
    }

    console.log(`[PackageUtils] Package ${packageId} updated successfully:`, updateData);
    return true;
  } catch (error) {
    console.error('[PackageUtils] Error in recalculatePackageConsumption:', error);
    return false;
  }
}

/**
 * Recalculates sessoes_consumidas for multiple packages
 * @param packageIds - Array of package IDs to recalculate
 * @returns Promise<boolean> - true if all updates were successful
 */
export async function recalculateMultiplePackages(packageIds: string[]): Promise<boolean> {
  const uniqueIds = [...new Set(packageIds.filter(Boolean))];
  
  if (uniqueIds.length === 0) {
    console.warn('[PackageUtils] recalculateMultiplePackages called with no valid IDs');
    return false;
  }
  
  console.log(`[PackageUtils] Recalculating ${uniqueIds.length} packages:`, uniqueIds);
  
  const results = await Promise.all(
    uniqueIds.map(id => recalculatePackageConsumption(id))
  );
  
  const allSuccessful = results.every(r => r === true);
  console.log(`[PackageUtils] Recalculation complete. All successful: ${allSuccessful}`);
  
  // Dispatch event to notify other components
  window.dispatchEvent(new Event('packageUpdated'));
  
  return allSuccessful;
}
