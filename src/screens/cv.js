import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { colors, radius } from '../theme';
import { useApp } from '../store';
import { Screen, BackHeader, Button, Card, Field, Progress, Note, text } from '../ui';

// ---------- The three CV templates ----------
// All templates use Times New Roman 12pt for body text so they print cleanly.
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl = (s = '') => esc(s).replace(/\n/g, '<br/>');
const BASE = `font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.4;color:#222;margin:0;`;
const page = (body) => `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>@page{margin:0}*{box-sizing:border-box}p{margin:0 0 6pt}</style></head><body style="${BASE}">${body}</body></html>`;

const expHtml = (cv, titleStyle = 'font-weight:bold') => cv.experience.map((e) => `
  <div style="margin-bottom:9pt">
    <div style="${titleStyle}">${esc(e.title)}${e.organisation ? `, ${esc(e.organisation)}` : ''}</div>
    ${e.period ? `<div style="color:#666;font-size:11pt">${esc(e.period)}</div>` : ''}
    ${e.description ? `<div>${nl(e.description)}</div>` : ''}
  </div>`).join('');
const eduHtml = (cv) => cv.education.map((e) => `<p>${esc(e)}</p>`).join('');
const contact = (cv) => [cv.location, cv.phone, cv.email].filter(Boolean).map(esc);
const extras = (cv) => [cv.licence && cv.licence !== 'None' ? `Driver's licence: ${esc(cv.licence)}` : '', ...cv.links.map(esc)].filter(Boolean);

function classic(cv) {
  const h = (t) => `<h2 style="font-size:12pt;color:${colors.teal};letter-spacing:1px;border-bottom:1.5px solid ${colors.teal};padding-bottom:3pt;margin:16pt 0 7pt">${t}</h2>`;
  return page(`<div style="padding:40px 44px">
    <div style="font-size:22pt;font-weight:bold;color:${colors.teal}">${esc(cv.name)}</div>
    ${cv.headline ? `<div style="font-size:13pt;margin-top:2pt">${esc(cv.headline)}</div>` : ''}
    <div style="color:#555;margin-top:4pt">${contact(cv).join(' &nbsp;|&nbsp; ')}</div>
    ${cv.summary ? h('PROFILE') + `<p>${nl(cv.summary)}</p>` : ''}
    ${cv.experience.length ? h('EXPERIENCE') + expHtml(cv) : ''}
    ${cv.education.length ? h('EDUCATION') + eduHtml(cv) : ''}
    ${cv.skills.length ? h('SKILLS') + `<p>${cv.skills.map(esc).join(' &nbsp;·&nbsp; ')}</p>` : ''}
    ${cv.languages ? h('LANGUAGES') + `<p>${esc(cv.languages)}</p>` : ''}
    ${extras(cv).length ? h('OTHER') + extras(cv).map((x) => `<p>${x}</p>`).join('') : ''}
    ${h('REFERENCES')}<p>Available on request.</p>
  </div>`);
}

function modern(cv) {
  const side = (t) => `<div style="font-size:11pt;font-weight:bold;letter-spacing:1px;margin:16pt 0 6pt;color:#FDF0D5">${t}</div>`;
  const main = (t) => `<h2 style="font-size:13pt;color:${colors.tealDark};margin:16pt 0 7pt">${t}</h2>`;
  return page(`<table style="width:100%;border-collapse:collapse;min-height:100vh"><tr>
    <td style="width:34%;vertical-align:top;background:${colors.tealDark};color:#fff;padding:36px 22px">
      ${cv.photo ? `<img src="${esc(cv.photo)}" style="width:96px;height:96px;border-radius:48px;object-fit:cover;border:3px solid ${colors.amber};margin-bottom:10pt"/>` : ''}
      <div style="font-size:19pt;font-weight:bold;line-height:1.2">${esc(cv.name)}</div>
      ${cv.headline ? `<div style="margin-top:4pt;color:#E0F0EE">${esc(cv.headline)}</div>` : ''}
      ${side('CONTACT')}${contact(cv).map((c) => `<p style="font-size:11pt;word-break:break-word">${c}</p>`).join('')}
      ${cv.skills.length ? side('SKILLS') + cv.skills.map((s) => `<p style="font-size:11pt">${esc(s)}</p>`).join('') : ''}
      ${cv.languages ? side('LANGUAGES') + `<p style="font-size:11pt">${esc(cv.languages).split(' · ').join('<br/>')}</p>` : ''}
      ${extras(cv).length ? side('OTHER') + extras(cv).map((x) => `<p style="font-size:11pt;word-break:break-word">${x}</p>`).join('') : ''}
    </td>
    <td style="vertical-align:top;padding:36px 30px">
      ${cv.summary ? main('About me') + `<p>${nl(cv.summary)}</p>` : ''}
      ${cv.experience.length ? main('Experience') + expHtml(cv, `font-weight:bold;color:${colors.teal}`) : ''}
      ${cv.education.length ? main('Education') + eduHtml(cv) : ''}
      ${main('References')}<p>Available on request.</p>
    </td></tr></table>`);
}

function minimal(cv) {
  const h = (t) => `<div style="display:flex;align-items:center;margin:18pt 0 8pt"><div style="font-size:10.5pt;letter-spacing:2px;color:#777;white-space:nowrap">${t}</div><div style="flex:1;height:1px;background:#ccc;margin-left:10px"></div></div>`;
  return page(`<div style="padding:46px 52px">
    <div style="text-align:center;font-size:21pt;letter-spacing:3px">${esc(cv.name.toUpperCase())}</div>
    ${cv.headline ? `<div style="text-align:center;color:#555;margin-top:3pt">${esc(cv.headline)}</div>` : ''}
    <div style="text-align:center;color:#555;margin-top:6pt;font-size:11pt">${contact(cv).join(' &nbsp;·&nbsp; ')}</div>
    ${cv.summary ? h('PROFILE') + `<p>${nl(cv.summary)}</p>` : ''}
    ${cv.experience.length ? h('EXPERIENCE') + expHtml(cv) : ''}
    ${cv.education.length ? h('EDUCATION') + eduHtml(cv) : ''}
    ${cv.skills.length ? h('SKILLS') + `<p>${cv.skills.map(esc).join(', ')}</p>` : ''}
    ${cv.languages ? h('LANGUAGES') + `<p>${esc(cv.languages)}</p>` : ''}
    ${extras(cv).length ? h('OTHER') + extras(cv).map((x) => `<p>${x}</p>`).join('') : ''}
    ${h('REFERENCES')}<p>Available on request.</p>
  </div>`);
}

export const TEMPLATES = [
  { id: 'classic', name: 'Classic', about: 'One column with teal headings. Safe for any job.', render: classic },
  { id: 'modern', name: 'Modern', about: 'Teal sidebar with your contact details, skills and photo.', render: modern },
  { id: 'minimal', name: 'Minimal', about: 'Clean black and white. Good for office and corporate jobs.', render: minimal },
];

// Small drawings of each layout for the picker
function Thumb({ id }) {
  const line = (w, c = '#D5DBDA', h = 4) => <View style={{ height: h, width: w, backgroundColor: c, borderRadius: 2, marginBottom: 4 }} />;
  if (id === 'modern') {
    return (
      <View style={[st.thumb, { flexDirection: 'row', padding: 0 }]}>
        <View style={{ width: '36%', backgroundColor: colors.tealDark, padding: 6 }}>
          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: colors.amber, marginBottom: 6 }} />
          {line('90%', '#FFFFFF', 5)}{line('70%', '#7FB5AD')}{line('80%', '#7FB5AD')}{line('60%', '#7FB5AD')}
        </View>
        <View style={{ flex: 1, padding: 6 }}>{line('70%', colors.tealDark)}{line('95%')}{line('90%')}{line('70%', colors.tealDark)}{line('85%')}{line('95%')}</View>
      </View>
    );
  }
  if (id === 'minimal') {
    return (
      <View style={[st.thumb, { alignItems: 'center' }]}>
        {line('60%', '#444', 5)}{line('45%')}
        <View style={{ height: 1, width: '100%', backgroundColor: '#BBB', marginVertical: 5 }} />
        {line('95%')}{line('90%')}
        <View style={{ height: 1, width: '100%', backgroundColor: '#BBB', marginVertical: 5 }} />
        {line('85%')}{line('95%')}
      </View>
    );
  }
  return (
    <View style={st.thumb}>
      {line('65%', colors.teal, 6)}{line('50%')}
      <View style={{ height: 1.5, width: '100%', backgroundColor: colors.teal, marginVertical: 5 }} />
      {line('95%')}{line('88%')}
      <View style={{ height: 1.5, width: '100%', backgroundColor: colors.teal, marginVertical: 5 }} />
      {line('92%')}{line('80%')}
    </View>
  );
}

function TemplatePicker({ visible, selected, onPick, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={onClose} />
      <View style={[st.sheet, { paddingBottom: 20 + insets.bottom }]}>
        <View style={st.handle} />
        <Text style={text.h2}>Choose a CV style</Text>
        <Text style={[text.muted, { marginBottom: 12 }]}>Your details stay the same. Only the look changes.</Text>
        {TEMPLATES.map((t) => (
          <Pressable key={t.id} onPress={() => onPick(t.id)} style={[st.tplRow, selected === t.id && st.tplOn]} accessibilityRole="radio" accessibilityState={{ selected: selected === t.id }}>
            <Thumb id={t.id} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={text.h3}>{t.name}</Text>
              <Text style={text.muted}>{t.about}</Text>
            </View>
            {selected === t.id && <Ionicons name="checkmark-circle" size={24} color={colors.teal} />}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

// ---------- CV builder ----------
export function CVBuilder() {
  const { data } = useApp();
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState('classic');
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cv, setCv] = useState({ name: '', headline: '', location: '', phone: '', email: '', summary: '', skills: [], education: [], languages: '', experience: [], licence: '', links: [], photo: '' });
  const [skillsText, setSkillsText] = useState('');
  const [eduText, setEduText] = useState('');
  const [exp, setExp] = useState({ title: '', organisation: '', period: '', description: '' });
  const set = (k) => (v) => setCv({ ...cv, [k]: v });

  const fillFromProfile = () => {
    const p = data.profile;
    const verified = data.skills.filter((s) => s.verified).map((s) => s.name.toLowerCase());
    const studying = data.education.some((e) => e.end_year === 'Still studying');
    const skills = data.skills.map((s) => (s.verified ? `${s.name} (verified)` : s.name));
    const education = data.education.map((e) => `${e.title}${e.school ? `, ${e.school}` : ''}${e.end_year === 'Still studying' ? ' (in progress)' : e.end_year ? `, ${e.end_year}` : ''}`);
    setCv({
      name: p.full_name || '',
      headline: p.headline || '',
      location: (p.location || '').split(',').slice(0, 2).join(',').trim(),
      phone: p.phone || '',
      email: p.email || '',
      summary: p.about || `Hardworking ${studying ? 'student' : 'young person'}${verified.length ? ` with verified ${verified.join(' and ')} skills` : ''}, ready to learn and grow.`,
      skills,
      education,
      languages: data.languages.map((l) => `${l.name} (${l.level.toLowerCase()})`).join(' · '),
      experience: data.experience.map((x) => ({ title: x.title, organisation: x.organisation, period: [x.start_text, x.end_text].filter(Boolean).join(' to '), description: x.description })),
      licence: p.drivers_licence || '',
      links: [p.linkedin_url, p.portfolio_url].filter(Boolean),
      photo: p.avatar_url || '',
    });
    setSkillsText(skills.join('\n'));
    setEduText(education.join('\n'));
  };

  const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);
  const html = () => TEMPLATES.find((t) => t.id === template).render(cv);

  const download = async () => {
    try {
      setBusy(true);
      const { uri } = await Print.printToFileAsync({ html: html() });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Save or share your CV', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF ready', `Saved to ${uri}`);
      }
    } catch {
      Alert.alert('Could not create PDF', 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const goNext = () => {
    if (step === 2) setCv({ ...cv, skills: lines(skillsText), education: lines(eduText) });
    setStep(step + 1);
  };

  const titles = ['Your details', 'About you', 'Experience', 'Preview'];
  const tpl = TEMPLATES.find((t) => t.id === template);

  return (
    <Screen>
      <BackHeader title="CV builder" />
      <Text style={text.small}>Step {step} of 4: {titles[step - 1]}</Text>
      <Progress value={step * 25} track={colors.border} />
      <View style={{ height: 14 }} />

      {step === 1 && (
        <>
          <Button title="Fill in from my profile" variant="outline" onPress={fillFromProfile} />
          <View style={{ height: 10 }} />
          <Field label="Full name" value={cv.name} onChangeText={set('name')} autoCapitalize="words" />
          <Field label="Headline" value={cv.headline} onChangeText={set('headline')} autoCapitalize="sentences" placeholder="e.g. IT student and phone repair technician" />
          <Field label="Area" value={cv.location} onChangeText={set('location')} autoCapitalize="words" />
          <Field label="Phone" value={cv.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <Field label="Email" value={cv.email} onChangeText={set('email')} keyboardType="email-address" />
        </>
      )}
      {step === 2 && (
        <>
          <Field label="Short profile" value={cv.summary} onChangeText={set('summary')} autoCapitalize="sentences" multiline />
          <Field label="Skills (one per line)" value={skillsText} onChangeText={setSkillsText} autoCapitalize="sentences" multiline />
          <Field label="Education (one per line)" value={eduText} onChangeText={setEduText} autoCapitalize="sentences" multiline />
          <Field label="Languages" value={cv.languages} onChangeText={set('languages')} autoCapitalize="sentences" />
        </>
      )}
      {step === 3 && (
        <>
          <Note>Informal work counts. Fixing phones, selling, tutoring or volunteering all show employers what you can do.</Note>
          {cv.experience.map((e, i) => (
            <Card key={`${e.title}${i}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}><Text style={text.h3}>{e.title}</Text><Text style={text.small}>{[e.organisation, e.period].filter(Boolean).join(' · ')}</Text></View>
              <Pressable onPress={() => setCv({ ...cv, experience: cv.experience.filter((_, x) => x !== i) })} hitSlop={10} accessibilityLabel={`Remove ${e.title}`}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </Card>
          ))}
          <Field label="What you did" value={exp.title} onChangeText={(v) => setExp({ ...exp, title: v })} placeholder="e.g. Phone repairs" autoCapitalize="sentences" />
          <Field label="Where or for whom" value={exp.organisation} onChangeText={(v) => setExp({ ...exp, organisation: v })} placeholder="e.g. Self-employed" autoCapitalize="sentences" />
          <Field label="When" value={exp.period} onChangeText={(v) => setExp({ ...exp, period: v })} placeholder="e.g. 2023 to now" autoCapitalize="sentences" />
          <Field label="What you achieved (optional)" value={exp.description} onChangeText={(v) => setExp({ ...exp, description: v })} placeholder="e.g. Repaired about 40 phones for customers in my area" autoCapitalize="sentences" multiline />
          <Button title="+ Add experience" variant="outline" disabled={!exp.title.trim()} onPress={() => { setCv({ ...cv, experience: [...cv.experience, exp] }); setExp({ title: '', organisation: '', period: '', description: '' }); }} />
        </>
      )}
      {step === 4 && (
        <>
          <Pressable style={st.styleRow} onPress={() => setPicker(true)}>
            <Thumb id={template} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={text.small}>Style</Text>
              <Text style={text.h3}>{tpl.name}</Text>
            </View>
            <Text style={text.link}>Change style</Text>
          </Pressable>
          <View style={st.preview}>
            <WebView originWhitelist={['*']} source={{ html: html() }} style={{ flex: 1, backgroundColor: colors.white }} scrollEnabled nestedScrollEnabled />
          </View>
          <Button title="Download PDF" onPress={download} loading={busy} disabled={!cv.name.trim()} />
          {!cv.name.trim() ? <Text style={[text.small, { textAlign: 'center' }]}>Add your name in step 1 first.</Text> : null}
        </>
      )}

      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        {step > 1 && <Button title="Back" variant="plain" onPress={() => setStep(step - 1)} style={{ flex: 1, marginRight: 6 }} />}
        {step < 4 && <Button title="Next" onPress={goNext} style={{ flex: 1, marginLeft: step > 1 ? 6 : 0 }} />}
      </View>

      <TemplatePicker visible={picker} selected={template} onPick={(id) => { setTemplate(id); setPicker(false); }} onClose={() => setPicker(false)} />
    </Screen>
  );
}

const st = StyleSheet.create({
  thumb: { width: 64, height: 84, backgroundColor: colors.white, borderRadius: 6, borderWidth: 1, borderColor: colors.border, padding: 7, overflow: 'hidden' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 14 },
  tplRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, marginBottom: 10 },
  tplOn: { borderColor: colors.teal, backgroundColor: colors.tealLight },
  styleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 10, marginBottom: 10 },
  preview: { height: 480, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 10, backgroundColor: colors.white },
});
