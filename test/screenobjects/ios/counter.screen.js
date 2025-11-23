class CounterScreen {
    get firstInputBtn () {
        return $('~IntegerA')
    }

    get secondInputBtn () {
        return $('~IntegerB')
    }

    get computeBtn () {
        return $('~ComputeSumButton')
    }

}

export default new CounterScreen()