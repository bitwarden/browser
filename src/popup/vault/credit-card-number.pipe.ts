import {
  Pipe,
  PipeTransform
} from '@angular/core';

@Pipe({ name: 'creditCardNumber' })
export class CreditCardNumberPipe implements PipeTransform {
  transform(creditCardNumber: string): string {
    // See https://baymard.com/checkout-usability/credit-card-patterns for
    // all possible credit card spacing patterns. For now, we just handle
    // the common 4-4-4-4 spacing of 16-digit card numbers.
    if (creditCardNumber.length === 16) {
      return [
        creditCardNumber.slice(0, 4),
        creditCardNumber.slice(4, 8),
        creditCardNumber.slice(8, 12),
        creditCardNumber.slice(12),
      ].join(' ');
    }

    return creditCardNumber;
  }
}