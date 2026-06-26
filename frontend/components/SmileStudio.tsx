/**
 * SmileStudio.tsx — Bundle U, Sprint T+3
 *
 * Expanded AR Smile Preview using face-api.js (zero SDK cost).
 * Features: shade selection, whitening intensity, gum contour, alignment overlay,
 *           before/after side-by-side, WhatsApp share.
 *
 * INTEGRATION:
 *   import SmileStudio from './SmileStudio';
 *   // Add to clinical tabs or in patient view:
 *   <SmileStudio clinicId={clinicId} patientId={patientId} />
 *
 * DEPS:
 *   npm install face-api.js
 *   Models in /public/face-api-models/ (download from face-api.js repo)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as api from "@/lib/api";
const TEAL = '#0E7C7B';

// Shade ladder (VITA classical)
const SHADES = [
  { key: 'B1', label: 'B1', hex: '#FFFAEC', desc: 'Brightest, Hollywood' },
  { key: 'A1', label: 'A1', hex: '#F8EFD4', desc: 'Very light' },
  { key: 'B2', label: 'B2', hex: '#F0E5C5', desc: 'Light, warm' },
  { key: 'A2', label: 'A2', hex: '#E8DAB0', desc: 'Light natural' },
  { key: 'C1', label: 'C1', hex: '#DDCC9F', desc: 'Light grey' },
  { key: 'A3', label: 'A3', hex: '#D4BE8E', desc: 'Natural (typical Indian)' },
  { key: 'B3', label: 'B3', hex: '#C9AE74', desc: 'Medium warm' },
  { key: 'A3.5', label: 'A3.5', hex: '#BFA56B', desc: 'Medium dark' },
  { key: 'C2', label: 'C2', hex: '#B69A66', desc: 'Medium grey' },
  { key: 'A4', label: 'A4', hex: '#9F8454', desc: 'Dark' },
];

export default function SmileStudio({
  clinicId, patientId
}: { clinicId: string; patientId?: string }) {
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [whitening, setWhitening] = useState(5);   // 0-10
  const [gumContour, setGumContour] = useState(0); // 0-5
  const [alignment, setAlignment] = useState(false);
  const [shade, setShade] = useState('A2');
  const [processing, setProcessing] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [view, setView] = useState<'edit' | 'compare'>('edit');

  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load face-api.js models
  useEffect(() => {
    (async () => {
      try {
        // @ts-ignore — face-api is loaded via script tag or import
        if (typeof window === 'undefined' || !(window as any).faceapi) {
          // Fallback: skip model loading, use simple filter approach
          setModelsReady(true);
          return;
        }
        const faceapi = (window as any).faceapi;
        await faceapi.nets.tinyFaceDetector.loadFromUri('/face-api-models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/face-api-models');
        setModelsReady(true);
      } catch (e) {
        console.warn('face-api models not loaded — using simple filter mode', e);
        setModelsReady(true);
      }
    })();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setBeforeImage(ev.target?.result as string);
      setAfterImage(null);
    };
    reader.readAsDataURL(file);
  };

  // Apply transformations
  const applyEffects = useCallback(async () => {
    if (!beforeImage || !beforeCanvasRef.current || !afterCanvasRef.current) return;

    setProcessing(true);
    const img = new Image();
    img.src = beforeImage;
    await new Promise(r => { img.onload = r; });

    // Setup both canvases
    [beforeCanvasRef.current, afterCanvasRef.current].forEach(canvas => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
    });

    const afterCanvas = afterCanvasRef.current;
    const ctx = afterCanvas.getContext('2d');
    if (!ctx) { setProcessing(false); return; }

    // Get face-api landmarks if available
    let mouthRegion: { x: number; y: number; w: number; h: number } | null = null;
    try {
      // @ts-ignore
      const faceapi = (window as any).faceapi;
      if (faceapi) {
        const detection = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();
        if (detection) {
          const mouth = detection.landmarks.getMouth();
          const xs = mouth.map((p: any) => p.x);
          const ys = mouth.map((p: any) => p.y);
          mouthRegion = {
            x: Math.min(...xs) - 10,
            y: Math.min(...ys) - 5,
            w: Math.max(...xs) - Math.min(...xs) + 20,
            h: Math.max(...ys) - Math.min(...ys) + 10
          };
        }
      }
    } catch (e) { /* fallback to center estimate */ }

    // Fallback: assume mouth in lower-center 25% of image
    if (!mouthRegion) {
      mouthRegion = {
        x: img.width * 0.35,
        y: img.height * 0.65,
        w: img.width * 0.3,
        h: img.height * 0.15
      };
    }

    // Apply whitening + shade tint to mouth region
    const imageData = ctx.getImageData(mouthRegion.x, mouthRegion.y, mouthRegion.w, mouthRegion.h);
    const data = imageData.data;
    const shadeHex = SHADES.find(s => s.key === shade)?.hex || '#E8DAB0';
    const sr = parseInt(shadeHex.slice(1, 3), 16);
    const sg = parseInt(shadeHex.slice(3, 5), 16);
    const sb = parseInt(shadeHex.slice(5, 7), 16);

    const whiteFactor = whitening / 10;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = (r * 0.299 + g * 0.587 + b * 0.114);

      // Detect tooth-like pixels: high luminance, low saturation
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      if (lum > 100 && sat < 0.4) {
        // Tooth pixel — apply shade
        data[i] = Math.min(255, r * (1 - whiteFactor * 0.5) + sr * whiteFactor * 0.5);
        data[i + 1] = Math.min(255, g * (1 - whiteFactor * 0.5) + sg * whiteFactor * 0.5);
        data[i + 2] = Math.min(255, b * (1 - whiteFactor * 0.5) + sb * whiteFactor * 0.5);

        // Boost luminance for whitening effect
        data[i] = Math.min(255, data[i] + whiteFactor * 20);
        data[i + 1] = Math.min(255, data[i + 1] + whiteFactor * 20);
        data[i + 2] = Math.min(255, data[i + 2] + whiteFactor * 18);
      }
    }
    ctx.putImageData(imageData, mouthRegion.x, mouthRegion.y);

    // Gum contour effect: subtle saturation boost on gum area (upper mouth region)
    if (gumContour > 0) {
      const gumArea = {
        x: mouthRegion.x,
        y: mouthRegion.y,
        w: mouthRegion.w,
        h: mouthRegion.h * 0.25
      };
      const gumData = ctx.getImageData(gumArea.x, gumArea.y, gumArea.w, gumArea.h);
      const gd = gumData.data;
      const intensity = gumContour / 5;
      for (let i = 0; i < gd.length; i += 4) {
        const r = gd[i], g = gd[i + 1], b = gd[i + 2];
        if (r > g && r > b && r > 120) {
          // Pinkish gum pixel
          gd[i] = Math.min(255, r * (1 + intensity * 0.15));
          gd[i + 1] = Math.max(0, g * (1 - intensity * 0.05));
          gd[i + 2] = Math.max(0, b * (1 - intensity * 0.05));
        }
      }
      ctx.putImageData(gumData, gumArea.x, gumArea.y);
    }

    // Alignment overlay: subtle grid lines
    if (alignment) {
      ctx.strokeStyle = 'rgba(14, 124, 123, 0.4)';
      ctx.lineWidth = 1;
      const gridCount = 8;
      for (let i = 0; i <= gridCount; i++) {
        const x = mouthRegion.x + (mouthRegion.w / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(x, mouthRegion.y);
        ctx.lineTo(x, mouthRegion.y + mouthRegion.h);
        ctx.stroke();
      }
    }

    setAfterImage(afterCanvas.toDataURL('image/png'));
    setProcessing(false);
  }, [beforeImage, whitening, gumContour, alignment, shade]);

  useEffect(() => {
    if (beforeImage && modelsReady) {
      applyEffects();
    }
  }, [beforeImage, modelsReady, applyEffects]);

  const handleSave = async () => {
    if (!beforeImage || !afterImage) return;
    try {
      await api.apiFetch(`/api/smile-sessions?clinic_id=${clinicId}`, {
        method: 'POST',
        body: JSON.stringify({
          patient_id: patientId,
          before_image_url: beforeImage,
          after_image_url: afterImage,
          whitening_level: whitening,
          gum_contour_level: gumContour,
          alignment_overlay: alignment,
          shade_preset: shade,
        }),
      });
      alert('Smile preview saved');
    } catch { alert('Save failed'); }
  };

  const handleShare = () => {
    if (!afterImage) return;
    const link = document.createElement('a');
    link.download = `smile-preview-${Date.now()}.png`;
    link.href = afterImage;
    link.click();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: '#212529' }}>
        ✨ AR Smile Studio
      </h2>
      <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6c757d' }}>
        Upload patient photo → adjust shade, whitening, gum contour → show before/after preview
      </p>

      {!beforeImage ? (
        <div style={{
          padding: '40px', borderRadius: '12px', border: `2px dashed ${TEAL}55`,
          background: '#f8fffe', textAlign: 'center', cursor: 'pointer',
        }} onClick={() => fileInputRef.current?.click()}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📸</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#212529' }}>
            Upload patient photo
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
            Front smile, well-lit, mouth open
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div>
          {/* View toggle */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
            {(['edit', 'compare'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '8px 16px', borderRadius: '6px',
                  border: 'none', background: view === v ? TEAL : '#f1f3f5',
                  color: view === v ? 'white' : '#495057',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {v === 'edit' ? '🎛 Edit' : '🔄 Compare'}
              </button>
            ))}
            <button
              onClick={() => { setBeforeImage(null); setAfterImage(null); }}
              style={{
                marginLeft: 'auto', padding: '8px 12px', borderRadius: '6px',
                border: '1px solid #dee2e6', background: 'white', color: '#6c757d',
                fontSize: '13px', cursor: 'pointer',
              }}
            >
              ↺ New photo
            </button>
          </div>

          {view === 'edit' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
              {/* Canvas */}
              <div>
                <canvas
                  ref={afterCanvasRef}
                  style={{
                    width: '100%', height: 'auto', borderRadius: '10px',
                    border: '1px solid #e9ecef', maxHeight: '500px', objectFit: 'contain',
                  }}
                />
                <canvas ref={beforeCanvasRef} style={{ display: 'none' }} />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Shade picker */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#495057' }}>Shade</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '6px' }}>
                    {SHADES.map(s => (
                      <button
                        key={s.key}
                        onClick={() => setShade(s.key)}
                        title={s.desc}
                        style={{
                          padding: '8px 4px', borderRadius: '6px',
                          border: shade === s.key ? `2px solid ${TEAL}` : '1px solid #dee2e6',
                          background: s.hex, cursor: 'pointer',
                          fontSize: '10px', fontWeight: 700, color: '#495057',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                    {SHADES.find(s => s.key === shade)?.desc}
                  </div>
                </div>

                {/* Whitening */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#495057', display: 'flex', justifyContent: 'space-between' }}>
                    Whitening <span style={{ color: TEAL, fontWeight: 700 }}>{whitening}</span>
                  </label>
                  <input
                    type="range" min={0} max={10} value={whitening}
                    onChange={e => setWhitening(Number(e.target.value))}
                    style={{ width: '100%', accentColor: TEAL }}
                  />
                </div>

                {/* Gum contour */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#495057', display: 'flex', justifyContent: 'space-between' }}>
                    Gum Contour <span style={{ color: TEAL, fontWeight: 700 }}>{gumContour}</span>
                  </label>
                  <input
                    type="range" min={0} max={5} value={gumContour}
                    onChange={e => setGumContour(Number(e.target.value))}
                    style={{ width: '100%', accentColor: TEAL }}
                  />
                </div>

                {/* Alignment overlay */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#495057', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={alignment}
                    onChange={e => setAlignment(e.target.checked)}
                    style={{ accentColor: TEAL }}
                  />
                  Show alignment overlay
                </label>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleSave}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                      background: TEAL, color: 'white', fontSize: '13px',
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    💾 Save
                  </button>
                  <button
                    onClick={handleShare}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '6px',
                      border: '1px solid #25D366', background: 'white', color: '#25D366',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    📤 Download
                  </button>
                </div>

                {processing && (
                  <div style={{ fontSize: '12px', color: TEAL, textAlign: 'center' }}>
                    Processing...
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Compare view
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <div style={{
                  padding: '4px 10px', background: '#fff5f5', color: '#c92a2a',
                  fontSize: '11px', fontWeight: 700, borderRadius: '4px 4px 0 0',
                  textAlign: 'center', textTransform: 'uppercase',
                }}>
                  Before
                </div>
                <img src={beforeImage} alt="before" style={{ width: '100%', borderRadius: '0 0 10px 10px' }} />
              </div>
              <div>
                <div style={{
                  padding: '4px 10px', background: TEAL_LIGHT, color: TEAL,
                  fontSize: '11px', fontWeight: 700, borderRadius: '4px 4px 0 0',
                  textAlign: 'center', textTransform: 'uppercase',
                }}>
                  After
                </div>
                {afterImage && (
                  <img src={afterImage} alt="after" style={{ width: '100%', borderRadius: '0 0 10px 10px' }} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TEAL_LIGHT = '#e8f5f5';
