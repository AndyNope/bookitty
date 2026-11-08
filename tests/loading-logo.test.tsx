import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LogoLoader, { LoadingIndicator, LoadingLogo } from '../src/components/LogoLoader';

test('full-screen loader announces status and preserves the cancellation command', () => {
  const markup = renderToStaticMarkup(<LogoLoader text="Beleg wird verarbeitet" onCancel={() => {}} />);
  assert.match(markup, /role="status"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /loading-logo--large/);
  assert.match(markup, /Beleg wird verarbeitet/);
  assert.match(markup, /<button[^>]*>Stapel stoppen<\/button>/);
});

test('compact loaders provide an accessible status without exposing decorative shapes', () => {
  const status = renderToStaticMarkup(<LoadingIndicator text="Konten werden geladen" size="small" />);
  assert.match(status, /role="status"/);
  assert.match(status, /Konten werden geladen/);
  assert.match(status, /loading-logo--small/);
  assert.match(renderToStaticMarkup(<LoadingLogo />), /aria-hidden="true"/);
});