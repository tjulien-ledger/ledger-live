#!/bin/bash

# just testing it doesn't crash here

export EXPERIMENTAL_EXPLORERS=1
ledger-live getFees -c eth --xpub xpub6BemYiVNp19aDejXFVmety2Sv1qruzhbE7p1zAkY6mjbEShEo4dkxyawqhXDuzQhpi83W6fZ463mcqdW1ZVJj9Y3V5hTqUB4YgBcw7UCFWp
ledger-live getFees -c xrp --xpub xpub6BemYiVNp19ZzgoVip83uhipVPKjNMjM4QYFeSJdA5EAUzQjNF66swQqH4afV15848dNnMLfcdrKkWZjNMAx2CZk1bfcukrdFGM3zzDfv1z
ledger-live getFees -c btc --xpub xpub6Bm5P7Xyx2UYrVBAgb54gEswXhbZaryZSWsPjeJ1jpb9K9S5UTD5z5cXW4EREkTqkNjSHQHxwHKZJVE7TFvftySnKabMAXAQCMSVJBdJxMC