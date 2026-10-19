'use client'

import { useState } from 'react'
import { SITE_DOMAIN } from '@/data/site'

const SSH_COMMAND = `ssh ${SITE_DOMAIN}`

export function SSHCopyButton() {
  const [copied, setCopied] = useState(false)

  function copySSH() {
    navigator.clipboard.writeText(SSH_COMMAND)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="ssh-hint">
      prefer a terminal?
      <button className="ssh-copy" onClick={copySSH}>
        <code>$ {SSH_COMMAND}</code>
        <span className="ssh-copy-label">{copied ? '[copied!]' : '[copy]'}</span>
      </button>
    </div>
  )
}
