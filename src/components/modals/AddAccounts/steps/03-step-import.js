// @flow

import invariant from 'invariant'
import React, { PureComponent, Fragment } from 'react'
import type { Account } from '@ledgerhq/live-common/lib/types'
import uniq from 'lodash/uniq'

import { getBridgeForCurrency } from 'bridge'

import Box from 'components/base/Box'
import CurrencyBadge from 'components/base/CurrencyBadge'
import Button from 'components/base/Button'
import AccountsList from 'components/base/AccountsList'
import IconExclamationCircleThin from 'icons/ExclamationCircleThin'

import type { StepProps } from '../index'

class StepImport extends PureComponent<StepProps> {
  componentDidMount() {
    this.startScanAccountsDevice()
  }

  componentDidUpdate(prevProps: StepProps) {
    // handle case when we click on stop sync
    if (prevProps.scanStatus !== 'finished' && this.props.scanStatus === 'finished') {
      this.unsub()
    }

    // handle case when we click on retry sync
    if (prevProps.scanStatus !== 'scanning' && this.props.scanStatus === 'scanning') {
      this.startScanAccountsDevice()
    }
  }

  componentWillUnmount() {
    this.unsub()
  }

  scanSubscription = null
  _unsubscribed = false

  unsub = () => {
    if (this.scanSubscription && !this._unsubscribed) {
      this.scanSubscription.unsubscribe()
      this._unsubscribed = true
    }
  }

  translateName(account: Account) {
    const { t } = this.props
    let { name } = account

    if (name === 'New Account') {
      name = t('app:addAccounts.newAccount')
    } else if (name.indexOf('legacy') !== -1) {
      name = t('app:addAccounts.legacyAccount', { accountName: name.replace(' (legacy)', '') })
    }

    return {
      ...account,
      name,
    }
  }

  startScanAccountsDevice() {
    const { currency, currentDevice, setState } = this.props
    try {
      invariant(currency, 'No currency to scan')
      invariant(currentDevice, 'No device')

      const bridge = getBridgeForCurrency(currency)

      // TODO: use the real device
      const devicePath = currentDevice.path

      setState({ scanStatus: 'scanning' })

      this._unsubscribed = false
      this.scanSubscription = bridge.scanAccountsOnDevice(currency, devicePath, {
        next: account => {
          // FIXME: this is called even if we unsubscribed
          if (this._unsubscribed) return

          const { scannedAccounts, checkedAccountsIds, existingAccounts } = this.props
          const hasAlreadyBeenScanned = !!scannedAccounts.find(a => account.id === a.id)
          const hasAlreadyBeenImported = !!existingAccounts.find(a => account.id === a.id)
          const isNewAccount = account.operations.length === 0
          if (!hasAlreadyBeenScanned) {
            setState({
              scannedAccounts: [...scannedAccounts, this.translateName(account)],
              checkedAccountsIds:
                !hasAlreadyBeenImported && !isNewAccount
                  ? uniq([...checkedAccountsIds, account.id])
                  : checkedAccountsIds,
            })
          }
        },
        complete: () => {
          // FIXME: this is called even if we unsubscribed
          if (this._unsubscribed) return
          setState({ scanStatus: 'finished' })
        },
        error: err => {
          // FIXME: this is called even if we unsubscribed
          if (this._unsubscribed) return
          setState({ scanStatus: 'error', err })
        },
      })
    } catch (err) {
      setState({ scanStatus: 'error', err })
    }
  }

  handleRetry = () => {
    if (this.scanSubscription) {
      this.scanSubscription.unsubscribe()
      this.scanSubscription = null
    }
    this.handleResetState()
    this.startScanAccountsDevice()
  }

  handleResetState = () => {
    const { setState } = this.props
    setState({
      scanStatus: 'idle',
      err: null,
      scannedAccounts: [],
      checkedAccountsIds: [],
    })
  }

  handleToggleAccount = (account: Account) => {
    const { checkedAccountsIds, setState } = this.props
    const isChecked = checkedAccountsIds.find(id => id === account.id) !== undefined
    if (isChecked) {
      setState({ checkedAccountsIds: checkedAccountsIds.filter(id => id !== account.id) })
    } else {
      setState({ checkedAccountsIds: [...checkedAccountsIds, account.id] })
    }
  }

  handleUpdateAccount = (updatedAccount: Account) => {
    const { scannedAccounts, setState } = this.props
    setState({
      scannedAccounts: scannedAccounts.map(account => {
        if (account.id !== updatedAccount.id) {
          return account
        }
        return updatedAccount
      }),
    })
  }

  handleSelectAll = () => {
    const { scannedAccounts, setState } = this.props
    setState({
      checkedAccountsIds: scannedAccounts.filter(a => a.operations.length > 0).map(a => a.id),
    })
  }

  handleUnselectAll = () => this.props.setState({ checkedAccountsIds: [] })

  renderError() {
    const { err, t } = this.props
    invariant(err, 'Trying to render inexisting error')
    return (
      <Box style={{ height: 200 }} align="center" justify="center" color="alertRed">
        <IconExclamationCircleThin size={43} />
        <Box mt={4}>{t('app:addAccounts.somethingWentWrong')}</Box>
      </Box>
    )
  }

  render() {
    const {
      scanStatus,
      currency,
      err,
      scannedAccounts,
      checkedAccountsIds,
      existingAccounts,
      t,
    } = this.props

    if (err) {
      return this.renderError()
    }

    const currencyName = currency ? currency.name : ''

    const importableAccounts = scannedAccounts.filter(acc => {
      if (acc.operations.length <= 0) {
        return false
      }
      return existingAccounts.find(a => a.id === acc.id) === undefined
    })

    const creatableAccounts = scannedAccounts.filter(acc => {
      if (acc.operations.length > 0) {
        return false
      }
      return existingAccounts.find(a => a.id === acc.id) === undefined
    })

    const importableAccountsListTitle = t('app:addAccounts.accountToImportSubtitle', {
      count: importableAccounts.length,
    })

    const importableAccountsEmpty = t('app:addAccounts.noAccountToImport', { currencyName })
    const hasAlreadyEmptyAccount = scannedAccounts.some(a => a.operations.length === 0)

    return (
      <Fragment>
        <Box flow={5}>
          <AccountsList
            title={importableAccountsListTitle}
            emptyText={importableAccountsEmpty}
            accounts={importableAccounts}
            checkedIds={checkedAccountsIds}
            onToggleAccount={this.handleToggleAccount}
            onUpdateAccount={this.handleUpdateAccount}
            onSelectAll={this.handleSelectAll}
            onUnselectAll={this.handleUnselectAll}
            isLoading={scanStatus === 'scanning'}
          />
          <AccountsList
            title={t('app:addAccounts.createNewAccount.title')}
            emptyText={
              hasAlreadyEmptyAccount
                ? t('app:addAccounts.createNewAccount.noOperationOnLastAccount')
                : t('app:addAccounts.createNewAccount.noAccountToCreate', { currencyName })
            }
            accounts={creatableAccounts}
            checkedIds={checkedAccountsIds}
            onToggleAccount={this.handleToggleAccount}
            onUpdateAccount={this.handleUpdateAccount}
            isLoading={scanStatus === 'scanning'}
          />
        </Box>

        {err && <Box shrink>{err.message}</Box>}
      </Fragment>
    )
  }
}

export default StepImport

export const StepImportFooter = ({
  setState,
  scanStatus,
  onClickAdd,
  onCloseModal,
  checkedAccountsIds,
  scannedAccounts,
  currency,
  t,
}: StepProps) => {
  const willCreateAccount = checkedAccountsIds.some(id => {
    const account = scannedAccounts.find(a => a.id === id)
    return account && account.operations.length === 0
  })

  const willAddAccounts = checkedAccountsIds.some(id => {
    const account = scannedAccounts.find(a => a.id === id)
    return account && account.operations.length > 0
  })

  const addedAccountsCount = checkedAccountsIds.filter(id => {
    const account = scannedAccounts.find(acc => acc.id === id)
    return account && account.operations.length > 0
  }).length

  const ctaWording =
    scanStatus === 'scanning'
      ? t('app:common.sync.syncing')
      : willCreateAccount && willAddAccounts
        ? `${t('app:addAccounts.cta.create')} / ${t('app:addAccounts.cta.import', {
            count: addedAccountsCount,
          })}`
        : willCreateAccount
          ? t('app:addAccounts.cta.create')
          : willAddAccounts
            ? t('app:addAccounts.cta.import', { count: addedAccountsCount })
            : t('app:common.close')

  const willClose = !willCreateAccount && !willAddAccounts
  const onClick = willClose ? onCloseModal : onClickAdd

  return (
    <Fragment>
      {currency && <CurrencyBadge mr="auto" currency={currency} />}
      {scanStatus === 'error' && (
        <Button mr={2} onClick={() => setState({ scanStatus: 'scanning', err: null })}>
          {t('app:common.retry')}
        </Button>
      )}
      {scanStatus === 'scanning' && (
        <Button mr={2} onClick={() => setState({ scanStatus: 'finished' })}>
          {t('app:addAccounts.cancelSync')}
        </Button>
      )}
      <Button
        primary
        disabled={scanStatus !== 'finished' && scanStatus !== 'error'}
        onClick={onClick}
      >
        {ctaWording}
      </Button>
    </Fragment>
  )
}
