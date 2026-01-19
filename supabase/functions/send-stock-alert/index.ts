import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface StockAlert {
  vaccine: string;
  type: 'critical' | 'low' | 'expiring';
  message: string;
}

interface StockAlertRequest {
  email: string;
  alerts: StockAlert[];
  facilityName: string;
  testMode?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured - logging alert instead");
      const { email, alerts, facilityName, testMode }: StockAlertRequest = await req.json();
      console.log("Stock alert would be sent to:", email);
      console.log("Facility:", facilityName);
      console.log("Alerts:", JSON.stringify(alerts, null, 2));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Alert logged (email service not configured)",
          alertCount: alerts?.length || 0
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, alerts, facilityName, testMode }: StockAlertRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const criticalAlerts = alerts?.filter(a => a.type === 'critical') || [];
    const lowStockAlerts = alerts?.filter(a => a.type === 'low') || [];
    const expiringAlerts = alerts?.filter(a => a.type === 'expiring') || [];

    const subject = testMode 
      ? `[TEST] Stock Alert - ${facilityName}`
      : `⚠️ Stock Alert: ${criticalAlerts.length > 0 ? 'CRITICAL' : 'Action Required'} - ${facilityName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #006B3F; color: white; padding: 20px; text-align: center; }
          .alert-section { margin: 20px 0; padding: 15px; border-radius: 8px; }
          .critical { background: #FEE2E2; border-left: 4px solid #DC2626; }
          .low { background: #FEF3C7; border-left: 4px solid #F59E0B; }
          .expiring { background: #FFEDD5; border-left: 4px solid #EA580C; }
          .alert-item { padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.1); }
          .alert-item:last-child { border-bottom: none; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-critical { background: #DC2626; color: white; }
          .badge-low { background: #F59E0B; color: white; }
          .badge-expiring { background: #EA580C; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏥 Vaccine Stock Alert</h1>
            <p>${facilityName}</p>
            ${testMode ? '<p style="background: #F59E0B; padding: 5px; border-radius: 4px;">[TEST NOTIFICATION]</p>' : ''}
          </div>
          
          ${criticalAlerts.length > 0 ? `
          <div class="alert-section critical">
            <h2><span class="badge badge-critical">CRITICAL</span> Immediate Action Required</h2>
            ${criticalAlerts.map(a => `
              <div class="alert-item">
                <strong>${a.vaccine}</strong>: ${a.message}
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${lowStockAlerts.length > 0 ? `
          <div class="alert-section low">
            <h2><span class="badge badge-low">LOW STOCK</span> Reorder Recommended</h2>
            ${lowStockAlerts.map(a => `
              <div class="alert-item">
                <strong>${a.vaccine}</strong>: ${a.message}
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${expiringAlerts.length > 0 ? `
          <div class="alert-section expiring">
            <h2><span class="badge badge-expiring">EXPIRING</span> Use Soon</h2>
            ${expiringAlerts.map(a => `
              <div class="alert-item">
                <strong>${a.vaccine}</strong>: ${a.message}
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          <div class="footer">
            <p>This is an automated alert from the Ghana Health Service Immunization Tracker.</p>
            <p>Please take appropriate action to maintain adequate vaccine stock levels.</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Resend API via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Vaccine Tracker <onboarding@resend.dev>",
        to: [email],
        subject: subject,
        html: htmlContent,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Failed to send email:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: result }),
        { status: emailResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Stock alert email sent:", result);

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-stock-alert function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);