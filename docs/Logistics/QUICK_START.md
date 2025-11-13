# 🚀 Quick Start Guide - External Steps & Logistics Module

**Everything is ready! Just follow these steps to start using the new features.**

---

## ⚡ Quick Start (5 minutes)

### Step 1: Run Migrations

```bash
php artisan migrate:fresh --seed
```

This creates/updates all necessary database tables.

---

### Step 2: Create Test Manufacturers (Optional)

If you don't have manufacturers yet:

```bash
php artisan tinker
```

Then in tinker:
```php
>>> \App\Models\AssetHierarchy\Manufacturer::factory()->create(['name' => 'ABC Heat Treating', 'email' => 'contact@abc.com']);
>>> \App\Models\AssetHierarchy\Manufacturer::factory()->create(['name' => 'XYZ Painting', 'email' => 'info@xyz.com']);
>>> exit
```

---

### Step 3: Access the New Features

Open your browser and navigate to:

#### **External Steps Dashboard**
```
http://your-domain/production/external-steps
```

#### **Logistics Shipments**
```
http://your-domain/logistics/shipments
```

Both are now in the sidebar under "🚚 Logística"!

---

## 🎯 Test the Complete Workflow (10 minutes)

### Test 1: Create External Step

1. Go to **Planning** (`/production/planning`)
2. Select any manufacturing order
3. Click on a step (or add new one)
4. In the properties panel, find **"Local de Execução"**
5. Click **"Execução Externa"**
6. Select a manufacturer
7. Enter lead time (e.g., 7 days)
8. Save the route
   ✓ Step is now external!

### Test 2: Ship Items

1. Release the MO (if not already released)
2. Go to **External Steps** (`/production/external-steps`)
3. You should see the step in **"Aguardando Envio"** tab
4. Click **"Marcar como Enviado"**
5. Enter quantity (e.g., 100)
6. Add notes (optional)
7. Upload photo (optional)
8. Confirm
   ✓ Step moves to "No Fabricante" tab!

### Test 3: Create Formal Shipment (Optional)

1. Go to **Shipments** (`/logistics/shipments`)
2. Click **"Nova Remessa"**
3. Try the QR scanner:
   - Click "Escanear QR Code"
   - Allow camera (if prompted)
   - Scan a MO QR code
   - OR type MO number manually
4. Item should appear in selected items
5. Fill in carrier, dates
6. Click **"Criar Remessa"**
   ✓ Shipment created!

### Test 4: Receive Items

1. Go back to shipment details
2. Click **"Marcar como Recebido"**
3. Add receiving notes (optional)
4. Upload photos (optional)
5. Confirm
   ✓ Shipment marked as received!
   ✓ External step completes!
   ✓ Next step in route activates!

---

## 🎨 What You'll See

### In Route Planning

When you select a step, the properties panel now shows:

```
┌─────────────────────────────────┐
│ Nome da Etapa                   │
│ Tipo: Padrão                    │
│ Célula de Trabalho: Cell A      │
├─────────────────────────────────┤
│ DEFINIÇÃO DE TEMPO              │
│ ● Tempo Específico              │
│   Setup: 10 min | Ciclo: 5 min │
├─────────────────────────────────┤
│ 🆕 LOCAL DE EXECUÇÃO            │
│ ○ Execução Interna              │
│ ● Execução Externa ← Selected! │
│   ├─ Fabricante: ABC Heat       │
│   ├─ Lead Time: 7 dias          │
│   └─ [Summary box]              │
└─────────────────────────────────┘
```

### In Step Cards

External steps show manufacturer info:

```
┌─────────────────────────────────┐
│ 2  Heat Treatment               │
│    [In Progress] [Shipped] ← !  │
│    📍 Work Cell B                │
│    ⏱ Lead time: 7 days          │
│    ────────────────────────────  │
│    🚚 ABC Heat Treating          │
│    Lead time: 7 dias             │
│    Enviado: 100 | Recebido: 0   │
└─────────────────────────────────┘
```

### In Navigation

New menu section:

```
🚚 Logística
   • Remessas
   • Etapas Externas
```

---

## 📋 Features Reference

### External Steps Dashboard

**URL**: `/production/external-steps`

**What it does**:
- Shows all steps awaiting shipment
- Shows all steps currently at manufacturers
- Allows direct status updates
- Tracks quantities shipped/received

**Actions available**:
- Mark as Shipped (with quantity, notes, photos)
- Mark as In Process
- Record Receipt (normally done via Logistics)

### Shipments Index

**URL**: `/logistics/shipments`

**What it does**:
- Lists all shipments with sorting/filtering
- Shows status, destination, items, tracking
- Provides quick actions menu
- Highlights overdue shipments

**Actions available**:
- Create new shipment
- View shipment details
- Mark as shipped
- Mark as received
- Download packing list
- Delete (if status = planned)

### Create Shipment

**URL**: `/logistics/shipments/create`

**What it does**:
- QR scanner for quick MO entry
- Smart bundling suggestions
- Multi-item shipment creation
- Automatic step association

**Features**:
- Camera scanning (with manual fallback)
- Add multiple MOs to one shipment
- See live summary (total MOs, units, manufacturers)
- Validation before submit

### Shipment Details

**URL**: `/logistics/shipments/{id}`

**What it does**:
- Complete shipment information
- Item-by-item details
- Status history
- Action buttons based on status

**Features**:
- Download packing list PDF
- Mark as shipped (with tracking input)
- Mark as received (with notes and photos)
- See who created/shipped/received
- Track receipt progress per item

---

## 🔧 Configuration

### Required
- ✅ Migrations (run above)
- ✅ html5-qrcode package (already installed)

### Optional
- Create manufacturers if you don't have any
- Configure camera permissions for QR scanning
- Customize packing list PDF template if needed

---

## 💡 Pro Tips

1. **Use QR Scanning**: Fastest way to add items to shipments
2. **Check Suggestions**: System groups items going to same manufacturer
3. **Track Progress**: External dashboard shows real-time status
4. **Batch Shipments**: Add multiple MOs to optimize freight costs
5. **Photo Documentation**: Upload photos for quality records

---

## 🆘 Troubleshooting

### "Cannot find route 'logistics.shipments.index'"
**Solution**: Clear route cache:
```bash
php artisan route:clear
php artisan route:cache
```

### "QR Scanner not working"
**Solutions**:
1. Allow camera permissions in browser
2. Use manual entry as fallback (it works the same!)
3. HTTPS required for camera access

### "Manufacturer dropdown is empty"
**Solution**: Create manufacturers first (see Step 2 above)

### "Step doesn't appear in External Dashboard"
**Check**:
1. Step is marked as `execution_location = 'external'`
2. Step has `manufacturer_id` assigned
3. MO is released (step status should be 'queued')
4. Step hasn't been shipped yet

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ You can select "External Execution" in route planning
2. ✅ External steps show manufacturer name in step cards
3. ✅ "Logística" appears in sidebar menu
4. ✅ External dashboard shows your external steps
5. ✅ You can create shipments via QR scanning
6. ✅ Marking shipment as received completes the step
7. ✅ Next step in route activates automatically

---

## 🎉 You're All Set!

The system is **production-ready**. Just run the migrations and start using it!

For detailed documentation, see:
- `README.md` - Overview
- `UI_INTEGRATION_COMPLETE.md` - Complete UI documentation
- `NEXT_STEPS.md` - Detailed testing scenarios
- Original specification files for reference

**Happy Manufacturing! 🏭📦🚚**

