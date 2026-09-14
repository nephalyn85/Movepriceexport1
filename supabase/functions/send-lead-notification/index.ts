import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InventoryItem {
  name: string;
  room: string;
  cubicFeet: number;
  qty: number;
}

interface LeadData {
  name: string;
  email: string;
  phone: string;
  fromCity: string;
  fromState: string;
  fromZip: string;
  toCity: string;
  toState: string;
  toZip: string;
  homeSize: string;
  moveDate: string;
  distanceMiles: number;
  estimatedLow: number;
  estimatedHigh: number;
  packing: boolean;
  packingBoxes: number;
  storage: boolean;
  storageUnitSize: string;
  storageUnitDimensions: string;
  assembly: boolean;
  fromStairs: number;
  toStairs: number;
  isBusyDay: boolean;
  inventoryItems?: InventoryItem[] | null;
  totalCubicFeet?: number | null;
  leadType?: string;
  leadId?: string | null;
}

const formatPrice = (price: number): string => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(price);

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const getHomeSizeLabel = (size: string): string => {
  const sizes: Record<string, string> = {
    studio: 'Studio', '1bed': '1 Bedroom', '2bed': '2 Bedrooms',
    '3bed': '3 Bedrooms', '4bed': '4+ Bedrooms', house: 'House (5+ rooms)',
  };
  return sizes[size] || size;
};

const buildInventoryTableHtml = (items: InventoryItem[], totalCf?: number | null): string => {
  const byRoom: Record<string, InventoryItem[]> = {};
  for (const item of items) {
    if (!byRoom[item.room]) byRoom[item.room] = [];
    byRoom[item.room].push(item);
  }
  const roomsHtml = Object.entries(byRoom).map(([room, roomItems]) => `
    <tr>
      <td colspan="3" style="padding: 10px 16px 4px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; background-color: #f0fdfa;">
        ${room}
      </td>
    </tr>
    ${roomItems.map(i => `
      <tr>
        <td style="padding: 6px 16px 6px 24px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b;">${i.qty > 1 ? `${i.name} &times;${i.qty}` : i.name}</td>
        <td style="padding: 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #64748b; text-align: right;">${i.cubicFeet} ft&sup3; each</td>
        <td style="padding: 6px 16px 6px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #0d9488; text-align: right;">${(i.cubicFeet * i.qty).toFixed(0)} ft&sup3;</td>
      </tr>
    `).join('')}
  `).join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border: 1px solid #99f6e4; border-radius: 8px; margin-bottom: 24px; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px; background-color: #0d9488;">
          <h2 style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #ffffff;">Moving Inventory List</h2>
          ${totalCf ? `<p style="margin: 4px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #ccfbf1;">Total: ${totalCf.toLocaleString()} ft&sup3; &middot; Est. ${(totalCf * 7).toLocaleString()} lbs</p>` : ''}
        </td>
      </tr>
      <tr>
        <td>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                <th style="padding: 8px 16px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #64748b; text-align: left; text-transform: uppercase;">Item</th>
                <th style="padding: 8px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #64748b; text-align: right; text-transform: uppercase;">Unit</th>
                <th style="padding: 8px 16px 8px 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: bold; color: #64748b; text-align: right; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${roomsHtml}
              <tr style="border-top: 2px solid #0d9488; background-color: #f0fdfa;">
                <td colspan="2" style="padding: 10px 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #0f766e;">Grand Total</td>
                <td style="padding: 10px 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #0d9488; text-align: right;">${totalCf ? `${totalCf.toLocaleString()} ft&sup3;` : ''}</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </table>
  `;
};

// Email sent to the CUSTOMER with their inventory list
const buildCustomerEmailHtml = (lead: LeadData): string => {
  const hasInventory = lead.inventoryItems && lead.inventoryItems.length > 0;
  const firstName = lead.name.split(' ')[0];

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding: 7px 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #64748b; width: 45%; vertical-align: top;">${label}</td>
      <td style="padding: 7px 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #1e293b; text-align: right; vertical-align: top;">${value}</td>
    </tr>`;

  const divider = `<tr><td colspan="2" style="padding: 4px 0;"><div style="border-top: 1px solid #e2e8f0;"></div></td></tr>`;

  const fromLabel = [lead.fromCity, lead.fromState].filter(Boolean).join(', ') + (lead.fromZip ? ` ${lead.fromZip}` : '');
  const toLabel   = [lead.toCity,   lead.toState  ].filter(Boolean).join(', ') + (lead.toZip   ? ` ${lead.toZip}`   : '');

  const stairsValue = (() => {
    const parts = [];
    if (lead.fromStairs > 0) parts.push(`${lead.fromStairs} floor${lead.fromStairs !== 1 ? 's' : ''} at pickup`);
    if (lead.toStairs   > 0) parts.push(`${lead.toStairs} floor${lead.toStairs !== 1 ? 's' : ''} at drop-off`);
    return parts.join('<br>');
  })();

  const additionalServices: string[] = [];
  if (lead.packing)  additionalServices.push(`Packing service (${lead.packingBoxes} boxes)`);
  if (lead.storage)  additionalServices.push(`Storage unit &mdash; ${lead.storageUnitSize} (${lead.storageUnitDimensions})`);
  if (lead.assembly) additionalServices.push('Furniture assembly');

  const moveDetailsHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 0;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td bgcolor="#0f766e" style="background-color: #0f766e; padding: 12px 20px; border-radius: 8px 8px 0 0;">
                <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff; letter-spacing: 0.02em;">YOUR MOVE DETAILS</p>
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  ${fromLabel  ? row('Moving From', fromLabel) : ''}
                  ${toLabel    ? row('Moving To',   toLabel)   : ''}
                  ${lead.distanceMiles > 0 ? row('Distance', `${lead.distanceMiles.toLocaleString()} miles`) : ''}
                  ${lead.homeSize      ? row('Home Size',  getHomeSizeLabel(lead.homeSize)) : ''}
                  ${lead.moveDate      ? row('Move Date',  `${formatDate(lead.moveDate)}${lead.isBusyDay ? ' &mdash; <span style="color:#dc2626;">Peak day</span>' : ''}`) : ''}
                  ${stairsValue        ? row('Stairs', stairsValue) : ''}
                  ${additionalServices.length > 0 ? `${divider}${row('Additional Services', additionalServices.join('<br>'))}` : ''}
                  ${lead.estimatedLow > 0 ? `
                    ${divider}
                    <tr>
                      <td style="padding: 10px 0 4px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; color: #0f766e;">Estimated Cost</td>
                      <td style="padding: 10px 0 4px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #0d9488; text-align: right;">${formatPrice(lead.estimatedLow)} &ndash; ${formatPrice(lead.estimatedHigh)}</td>
                    </tr>` : ''}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Moving Inventory List</title>
  <!--[if mso]><style type="text/css">body, table, td {font-family: Arial, Helvetica, sans-serif !important;}</style><![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td bgcolor="#0d9488" style="background-color: #0d9488; padding: 32px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <p style="margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif; font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: 1px;">MOVE-PRICE</p>
              <h1 style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 22px; font-weight: bold; color: #ffffff;">Your Moving Inventory List</h1>
              <p style="margin: 8px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #ccfbf1;">Here's everything you checked off — ready to share with movers</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td bgcolor="#ffffff" style="background-color: #ffffff; padding: 32px 24px; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #334155;">Hi ${firstName},</p>
              <p style="margin: 0 0 24px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #334155; line-height: 1.6;">
                Thanks for using our inventory calculator! Below is your complete moving inventory list along with your move details. You can share this directly with movers to get accurate quotes.
              </p>

              ${moveDetailsHtml}
              ${hasInventory ? buildInventoryTableHtml(lead.inventoryItems!, lead.totalCubicFeet) : ''}

              <!-- Tip box -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #a16207;">Pro tip</p>
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #713f12; line-height: 1.5;">
                      Share this list with any moving company you contact — it helps them give you a more accurate price and avoids surprises on moving day.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="text-align: center; padding: 8px 0;">
                    <p style="margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Ready to compare movers? Your details are saved — one click and we'll match you with top 3 movers.</p>
                    <a href="https://move-price.com/get-quotes?lead=${lead.leadId ?? ''}" style="display: inline-block; background-color: #0d9488; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 16px 36px; border-radius: 8px;">
                      Get My Free Moving Quotes &rarr;
                    </a>
                    <p style="margin: 10px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">Free &middot; No obligation &middot; Compare top 3 movers</p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding-top: 20px; text-align: center;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #94a3b8;">Move-Price.com &mdash; Free moving cost calculator</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Email sent to the OWNER with full lead details
const buildOwnerEmailHtml = (lead: LeadData): string => {
  const services = [];
  if (lead.packing) services.push(`Packing Service (${lead.packingBoxes} boxes)`);
  if (lead.storage) services.push(`Storage Unit – ${lead.storageUnitSize} (${lead.storageUnitDimensions})`);
  if (lead.assembly) services.push('Furniture Assembly');
  const isEmailListOnly = lead.leadType === 'email_list';
  const hasInventory = lead.inventoryItems && lead.inventoryItems.length > 0;

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isEmailListOnly ? 'Moving Inventory List' : 'New Moving Lead'}</title>
  <!--[if mso]><style type="text/css">body, table, td {font-family: Arial, Helvetica, sans-serif !important;}</style><![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; width: 100%;">
          <tr>
            <td bgcolor="#0d9488" style="background-color: #0d9488; padding: 32px 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <p style="margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif; font-size: 32px; font-weight: bold; color: #ffffff; letter-spacing: 1px;">MOVE-PRICE</p>
              <h1 style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 24px; font-weight: bold; color: #ffffff;">
                ${isEmailListOnly ? 'Inventory List Request' : 'New Moving Lead'}
              </h1>
              <p style="margin: 8px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #ccfbf1;">
                ${isEmailListOnly ? 'Customer requested their inventory list by email' : 'A new customer is requesting moving quotes'}
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="background-color: #ffffff; padding: 32px 24px; border-radius: 0 0 8px 8px;">
              <!-- Customer Information -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #0f766e;">Customer Information</h2>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Name</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; text-align: right;">${lead.name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Email</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; text-align: right;">
                          <a href="mailto:${lead.email}" style="color: #0d9488; text-decoration: none;">${lead.email}</a>
                        </td>
                      </tr>
                      ${lead.phone ? `
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Phone</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; text-align: right;">
                          <a href="tel:${lead.phone}" style="color: #0d9488; text-decoration: none;">${lead.phone}</a>
                        </td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Request Type</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; text-align: right;">${lead.leadType === 'email_list' ? 'Inventory List Only' : lead.leadType === 'both' ? 'Quotes + Inventory List' : 'Quote Request'}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${hasInventory ? buildInventoryTableHtml(lead.inventoryItems!, lead.totalCubicFeet) : ''}

              ${!isEmailListOnly ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 16px 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #a16207;">Move Details</h2>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">From</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; text-align: right;">${lead.fromCity}, ${lead.fromState} ${lead.fromZip}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">To</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; text-align: right;">${lead.toCity}, ${lead.toState} ${lead.toZip}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Distance</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; text-align: right;">${lead.distanceMiles} miles</td>
                      </tr>
                      ${lead.moveDate ? `
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Move Date</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; text-align: right;">${formatDate(lead.moveDate)}${lead.isBusyDay ? ' (Peak Day)' : ''}</td>
                      </tr>` : ''}
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Home Size</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; text-align: right;">${getHomeSizeLabel(lead.homeSize)}</td>
                      </tr>
                      ${lead.fromStairs > 0 || lead.toStairs > 0 ? `
                      <tr>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #64748b;">Stairs</td>
                        <td style="padding: 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #1e293b; text-align: right;">${lead.fromStairs} floors (from) / ${lead.toStairs} floors (to)</td>
                      </tr>` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${services.length > 0 ? `
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f9ff; border: 1px solid #7dd3fc; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h2 style="margin: 0 0 12px 0; font-family: Arial, Helvetica, sans-serif; font-size: 18px; font-weight: bold; color: #0369a1;">Additional Services</h2>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      ${services.map(s => `<tr><td style="padding: 4px 0 4px 16px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1e293b;">&#8226; ${s}</td></tr>`).join('')}
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td bgcolor="#0d9488" style="background-color: #0d9488; padding: 24px; text-align: center; border-radius: 8px;">
                    <p style="margin: 0 0 8px 0; font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #ccfbf1;">Estimated Price Range</p>
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 28px; font-weight: bold; color: #ffffff;">${formatPrice(lead.estimatedLow)} - ${formatPrice(lead.estimatedHigh)}</p>
                  </td>
                </tr>
              </table>` : ''}

              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding-top: 24px; text-align: center;">
                    <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #64748b;">Submitted through move-price.com</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

const sendEmail = async (apiKey: string, to: string, subject: string, html: string) => {
  const from = "Move Price <admin@move-price.com>";
  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  return resp;
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const notificationEmail = Deno.env.get("NOTIFICATION_EMAIL");

    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Email service not configured", code: "NO_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!notificationEmail) {
      return new Response(JSON.stringify({ error: "Notification email not configured", code: "NO_EMAIL" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lead: LeadData = await req.json();

    const isEmailListOnly = lead.leadType === 'email_list';
    const wantsInventoryEmail = lead.leadType === 'email_list' || lead.leadType === 'both';

    // 1. Always notify the owner
    const ownerSubject = isEmailListOnly
      ? `Inventory List Request: ${lead.name} — ${lead.fromCity || 'unknown'}`
      : `New Lead: ${lead.name} - ${lead.fromCity}, ${lead.fromState} to ${lead.toCity}, ${lead.toState}`;

    const ownerHtml = buildOwnerEmailHtml(lead);

    // Send to both notification email and admin@move-price.com in parallel
    const recipients = [notificationEmail];
    if (notificationEmail !== "admin@move-price.com") {
      recipients.push("admin@move-price.com");
    }

    const results = await Promise.allSettled(
      recipients.map((to) => sendEmail(resendApiKey, to, ownerSubject, ownerHtml).then((r) => r.json().then((body) => ({ ok: r.ok, body }))))
    );

    const ownerResult = results[0];
    if (ownerResult.status === "fulfilled" && !ownerResult.value.ok) {
      console.error("Owner email failed:", ownerResult.value.body);
      return new Response(JSON.stringify({ error: "Failed to send owner notification", details: ownerResult.value.body }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ownerResult.status === "rejected") {
      console.error("Owner email threw:", ownerResult.reason);
      return new Response(JSON.stringify({ error: "Failed to send owner notification" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (results.length > 1) {
      const adminResult = results[1];
      if (adminResult.status === "fulfilled" && !adminResult.value.ok) {
        console.error("Admin email failed:", adminResult.value.body);
      } else if (adminResult.status === "rejected") {
        console.error("Admin email threw:", adminResult.reason);
      }
    }

    const ownerMessageId = ownerResult.status === "fulfilled" ? ownerResult.value.body.id : null;

    // 2. Send customer their inventory list when they asked for it
    let customerMessageId: string | null = null;
    if (wantsInventoryEmail && lead.email) {
      const customerSubject = `Your Moving Inventory List from Move-Price`;
      const customerResp = await sendEmail(resendApiKey, lead.email, customerSubject, buildCustomerEmailHtml(lead));
      const customerResult = await customerResp.json();
      if (!customerResp.ok) {
        console.error("Customer email failed:", customerResult);
        // Don't fail the whole request — owner email already sent
      } else {
        customerMessageId = customerResult.id;
      }
    }

    const maskedEmail = notificationEmail.replace(/(.{2}).+(@.+)/, '$1***$2');
    return new Response(JSON.stringify({ success: true, ownerMessageId, customerMessageId, sentTo: maskedEmail }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
