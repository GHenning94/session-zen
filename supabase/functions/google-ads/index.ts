import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { conversionAction, userId, value } = await req.json()
    
    console.log('Google Ads conversion tracking:', { conversionAction, userId, value })

    // Get Google Ads configuration from environment
    const googleAdsCustomerId = Deno.env.get('GOOGLE_ADS_CUSTOMER_ID')
    const googleAdsConversionId = Deno.env.get('GOOGLE_ADS_CONVERSION_ID')
    const googleAdsConversionLabel = Deno.env.get('GOOGLE_ADS_CONVERSION_LABEL')

    if (!googleAdsCustomerId || !googleAdsConversionId || !googleAdsConversionLabel) {
      throw new Error('Google Ads configuration not found')
    }

    // Track conversion event
    const conversionData = {
      customer_id: googleAdsCustomerId,
      conversions: [{
        conversion_action: `customers/${googleAdsCustomerId}/conversionActions/${googleAdsConversionId}`,
        conversion_date_time: new Date().toISOString(),
        conversion_value: value || 0,
        currency_code: 'BRL',
        order_id: `order_${userId}_${Date.now()}`,
        user_identifiers: [{
          hashed_email: userId // Should be hashed email in production
        }]
      }]
    }

    console.log('Conversion data prepared:', conversionData)

    // In a real implementation, you would use Google Ads API here
    // For now, we'll just log the conversion data
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Conversion tracked successfully',
        conversionData 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error tracking Google Ads conversion:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})