'use client'

import { useState } from 'react'
import { FiCheck, FiCopy } from 'react-icons/fi'
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
        <span className="ssh-copy-label">
          {copied ? <FiCheck size={13} /> : <FiCopy size={13} />}
        </span>
      </button>
    </div>
  )
}
