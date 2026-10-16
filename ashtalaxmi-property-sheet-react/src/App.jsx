import React, { useEffect, useRef, useState } from 'react';
import { VILLAGES, TP_NOS, ZONES, TP_TYPES, NA_STATUS, ROADS, FEATURES, LIMITS } from './config.js';
import { EMPTY_FORM, calcYd, normMap, toSheetData, validate } from './lib/form.js';
import { buildPdf } from './pdf/sheet.js';
import { Field, TextInput, NumberInput, Select, OtherBox, RadioChips, CheckChips } from './components/fields.jsx';
import PlotImageInput from './components/PlotImageInput.jsx';
import ResultView from './components/ResultView.jsx';
import logoUrl from './assets/logo.png';

const opts = (list) => list.map((v) => ({ value: v, label: v }));
const FIELD_ORDER = ['village', 'zone', 'tpType', 'tpNo', 'sqm', 'sqyd', 'vigha', 'road', 'fsi', 'na', 'map'];

function useToast() {
  const [msg, setMsg] = useState('');
  const [show, setShow] = useState(false);
  const t = useRef();
  const toast = (m) => {
    setMsg(m);
    setShow(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setShow(false), 2600);
  };
  return [
    <div key="toast" className={`toast${show ? ' show' : ''}`} id="toast">
      {msg}
    </div>,
    toast,
  ];
}

export default function App() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [plot, setPlot] = useState(null); // optional plot image {src,name,info}
  const [showErrors, setShowErrors] = useState(false); // errors appear after the first SUBMIT, then update live
  const [view, setView] = useState('form'); // 'form' | 'done'
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // {blob,url,name,preview,data}
  const [status, setStatus] = useState('');
  const [resetArmed, setResetArmed] = useState(false);
  const resetTimer = useRef();
  const [toastEl, toast] = useToast();

  /** Update one or more fields. */
  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const errors = showErrors ? validate(form) : {};
  const set = (key) => (value) => update({ [key]: value });

  // Sq. Yd. fills itself from Sq. Mtr. until someone types their own value.
  const setSqm = (v) => update(form.ydManual ? { sqm: v } : { sqm: v, sqyd: calcYd(v) });
  const setSqyd = (v) => update({ sqyd: v, ydManual: v !== calcYd(form.sqm) });

  const download = (r = result) => {
    if (!r) return;
    const a = document.createElement('a');
    a.href = r.url;
    a.download = r.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus('Your PDF is downloading. If nothing appears, press “Download PDF”.');
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setShowErrors(true);
    const bad = FIELD_ORDER.filter((k) => errs[k]);
    if (bad.length) {
      const el = document.querySelector(`[data-f=${bad[0]}]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(bad.length === 1 ? '1 field needs attention' : `${bad.length} fields need attention`);
      setTimeout(
        () =>
          el
            ?.querySelector('input:not([type=radio]):not([type=checkbox]),select,input')
            ?.focus({ preventScroll: true }),
        350,
      );
      return;
    }
    setBusy(true);
    try {
      const data = toSheetData(form);
      const pdf = await buildPdf(data, plot?.src || null);
      if (result) URL.revokeObjectURL(result.url);
      const r = { ...pdf, data };
      setResult(r);
      setView('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      download(r);
    } catch (err) {
      console.error(err);
      toast('Could not create the PDF — ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  const clearForm = () => {
    setForm(EMPTY_FORM);
    setPlot(null);
    setShowErrors(false);
  };

  const onReset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      toast('Tap “Clear all?” again to empty the form');
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setResetArmed(false), 4000);
      return;
    }
    clearTimeout(resetTimer.current);
    setResetArmed(false);
    clearForm();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast('Form cleared');
  };

  useEffect(() => () => result && URL.revokeObjectURL(result.url), [result]);

  const f = form;
  return (
    <>
      <header className="top">
        <div className="top-in">
          <img src={logoUrl} alt="Ashtalaxmi, Dholera SIR 1" />
          <div className="goldrule" aria-hidden="true" />
          <h1>Property Information Sheet</h1>
          <p>Fill in the details you have and press Submit. The PDF is created for you.</p>
        </div>
      </header>

      <main className="wrap">
        <div className="steps" aria-label="Progress">
          <span id="st1" className={view === 'form' ? 'on' : 'done'}>
            <i>1</i>Fill details
          </span>
          <hr />
          <span id="st2" className={view === 'done' ? 'on' : ''}>
            <i>2</i>PDF ready
          </span>
        </div>

        <form className="view" id="f" noValidate autoComplete="off" onSubmit={submit} hidden={view !== 'form'}>
          <div>
            <section className="card">
              <div className="sec-h">
                <span className="n">01</span>
                <h2>Location</h2>
              </div>
              <div className="grid">
                <Field name="village" label="Village / Town" labelFor="village" error={errors.village}>
                  <Select
                    id="village"
                    value={f.village}
                    onChange={set('village')}
                    placeholder="Select village…"
                    options={VILLAGES.map(([en, gu], i) => ({ value: String(i), label: `${en} (${gu})` }))}
                  />
                  <OtherBox
                    show={f.village === 'other'}
                    id="village_other"
                    value={f.villageOther}
                    onChange={set('villageOther')}
                    maxLength={LIMITS.villageOther}
                    placeholder="Specify village name"
                  />
                </Field>
                <Field name="zone" label="Zone" labelFor="zone" error={errors.zone}>
                  <Select
                    id="zone"
                    value={f.zone}
                    onChange={set('zone')}
                    placeholder="Select zone…"
                    options={opts(ZONES)}
                  />
                  <OtherBox
                    show={f.zone === 'other'}
                    id="zone_other"
                    value={f.zoneOther}
                    onChange={set('zoneOther')}
                    maxLength={LIMITS.zoneOther}
                    placeholder="Specify zone"
                  />
                </Field>
                <Field name="newSurvey" label="New Survey No." labelFor="newSurvey">
                  <TextInput
                    id="newSurvey"
                    value={f.newSurvey}
                    onChange={set('newSurvey')}
                    maxLength={LIMITS.newSurvey}
                    placeholder="e.g. 352"
                  />
                </Field>
                <Field name="oldSurvey" label="Old Survey No." labelFor="oldSurvey">
                  <TextInput
                    id="oldSurvey"
                    value={f.oldSurvey}
                    onChange={set('oldSurvey')}
                    maxLength={LIMITS.oldSurvey}
                    placeholder="e.g. 57/2"
                  />
                </Field>
              </div>
            </section>

            <section className="card">
              <div className="sec-h">
                <span className="n">02</span>
                <h2>Town Planning</h2>
              </div>
              <div className="grid">
                <Field name="tpType" label="T.P. Type" full error={errors.tpType}>
                  <RadioChips
                    id="tpType"
                    name="tpType"
                    items={opts(TP_TYPES)}
                    value={f.tpType}
                    onChange={set('tpType')}
                    withOther
                  />
                  <OtherBox
                    show={f.tpType === 'other'}
                    id="tpType_other"
                    value={f.tpTypeOther}
                    onChange={set('tpTypeOther')}
                    maxLength={LIMITS.tpTypeOther}
                    placeholder="Specify T.P. type"
                  />
                </Field>
                <Field name="tpNo" label="T.P. No." labelFor="tpNo" error={errors.tpNo}>
                  <Select
                    id="tpNo"
                    value={f.tpNo}
                    onChange={set('tpNo')}
                    placeholder="Select T.P. No…"
                    options={opts(TP_NOS)}
                  />
                  <OtherBox
                    show={f.tpNo === 'other'}
                    id="tpNo_other"
                    value={f.tpNoOther}
                    onChange={set('tpNoOther')}
                    maxLength={LIMITS.tpNoOther}
                    placeholder="Specify T.P. No."
                  />
                </Field>
                <Field name="fpNo" label="F.P. No." labelFor="fpNo">
                  <TextInput
                    id="fpNo"
                    value={f.fpNo}
                    onChange={set('fpNo')}
                    maxLength={LIMITS.fpNo}
                    placeholder="e.g. 7"
                  />
                </Field>
              </div>
            </section>

            <section className="card">
              <div className="sec-h">
                <span className="n">03</span>
                <h2>Area</h2>
              </div>
              <div className="grid">
                <Field name="sqm" label="F.P. Area (Sq. Mtr.)" labelFor="sqm" error={errors.sqm}>
                  <NumberInput
                    id="sqm"
                    value={f.sqm}
                    onChange={setSqm}
                    maxLength={LIMITS.sqm}
                    unit="Sq. Mtr."
                    placeholder="8635.5"
                  />
                </Field>
                <Field
                  name="sqyd"
                  labelFor="sqyd"
                  error={errors.sqyd}
                  label={
                    <>
                      F.P. Area (Sq. Yd.){' '}
                      {f.ydManual ? (
                        <button
                          type="button"
                          className="linkbtn"
                          id="reAuto"
                          onClick={() => update({ sqyd: calcYd(f.sqm), ydManual: false })}
                        >
                          Recalculate
                        </button>
                      ) : (
                        <span className="auto-badge" id="autoBadge">
                          Auto
                        </span>
                      )}
                    </>
                  }
                >
                  <NumberInput
                    id="sqyd"
                    value={f.sqyd}
                    onChange={setSqyd}
                    maxLength={LIMITS.sqyd}
                    unit="Sq. Yd."
                    placeholder="10328"
                  />
                </Field>
                <Field name="vigha" label="Vigha" labelFor="vigha" error={errors.vigha}>
                  <NumberInput
                    id="vigha"
                    value={f.vigha}
                    onChange={set('vigha')}
                    maxLength={LIMITS.vigha}
                    placeholder="10.67"
                  />
                </Field>
              </div>
            </section>

            <section className="card">
              <div className="sec-h">
                <span className="n">04</span>
                <h2>Access &amp; Status</h2>
              </div>
              <div className="grid">
                <Field name="road" label="Road" hint="pick a width or type your own" full error={errors.road}>
                  <div className="road-row">
                    <RadioChips
                      id="roadChips"
                      name="roadChip"
                      items={ROADS.map((r) => ({ value: r, label: `${r} m` }))}
                      value={ROADS.includes(f.road) ? f.road : ''}
                      onChange={set('road')}
                    />
                    <NumberInput
                      id="road"
                      value={f.road}
                      onChange={set('road')}
                      maxLength={LIMITS.road}
                      unit="Mtr."
                      placeholder="Custom"
                      ariaLabel="Road width in metres"
                    />
                  </div>
                </Field>
                <Field name="fsi" label="FSI" labelFor="fsi" error={errors.fsi}>
                  <NumberInput
                    id="fsi"
                    value={f.fsi}
                    onChange={set('fsi')}
                    maxLength={LIMITS.fsi}
                    placeholder="e.g. 1.8"
                  />
                </Field>
                <Field name="na" label="NA Status" error={errors.na}>
                  <RadioChips id="na" name="na" items={opts(NA_STATUS)} value={f.na} onChange={set('na')} withOther />
                  <OtherBox
                    show={f.na === 'other'}
                    id="na_other"
                    value={f.naOther}
                    onChange={set('naOther')}
                    maxLength={LIMITS.naOther}
                    placeholder="Specify NA status"
                  />
                </Field>
                <Field name="features" label="Features" hint="select as many as apply, or add your own" full>
                  <CheckChips
                    id="features"
                    name="feat"
                    items={FEATURES}
                    values={f.features}
                    onChange={set('features')}
                  />
                  <div style={{ marginTop: 10 }}>
                    <TextInput
                      id="featExtra"
                      value={f.featExtra}
                      onChange={set('featExtra')}
                      maxLength={LIMITS.featExtra}
                      placeholder="Add other features (comma separated)"
                    />
                  </div>
                </Field>
                <Field name="map" label="Google Location Link" labelFor="map" full error={errors.map}>
                  <TextInput
                    id="map"
                    inputMode="url"
                    value={f.map}
                    onChange={set('map')}
                    maxLength={LIMITS.map}
                    placeholder="https://maps.app.goo.gl/…"
                    onBlur={() => {
                      const n = normMap(f.map);
                      if (n !== f.map) update({ map: n });
                    }}
                  />
                </Field>
              </div>
            </section>

            <section className="card">
              <div className="sec-h">
                <span className="n">05</span>
                <h2>Plot Image</h2>
              </div>
              <PlotImageInput value={plot} onChange={setPlot} />
            </section>
          </div>

          <div className="submitbar">
            <button
              type="button"
              className="btn btn-ghost"
              data-act="reset"
              data-armed={resetArmed ? '1' : ''}
              onClick={onReset}
            >
              {resetArmed ? 'Clear all?' : 'Reset'}
            </button>
            <button type="submit" className="btn btn-primary" id="submitBtn" disabled={busy}>
              {busy ? 'Creating PDF…' : 'SUBMIT'}
            </button>
          </div>
          <p className="note">
            All fields are optional. Empty fields show as “—” on the PDF. If you choose “Other”, type what it is in the
            box that appears.
          </p>
        </form>

        {view === 'done' && result && (
          <ResultView
            result={result}
            status={status}
            onDownload={() => download()}
            onEdit={() => {
              setView('form');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNew={() => {
              clearForm();
              setView('form');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>
      {toastEl}
    </>
  );
}
