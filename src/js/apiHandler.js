const baseApiData = {
  apiKey: 'd7PLUCql1DUVNbas9tgX',
  baseSearchURL: {
    get: () => `https://api.winnipegtransit.com/v3/streets.json?usage=long&api-key=${baseApiData.apiKey}&name=`
  },
  baseStopURL: {
    get: () => `https://api.winnipegtransit.com/v3/stops.json?usage=long&api-key=${baseApiData.apiKey}&street=`
  },
}

class TransitSchedule {
  constructor() {
    this.searchResults = [];
    this.streetStops = [];
    this.startOfQuery = '';
    this.currentStreetTitle = '';
  }

  getData = async url => {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  }

  getStopScheduleURL = stopId => {
    const year = TimeFormatter.getYear();
    const month = TimeFormatter.getMonth();
    const day = TimeFormatter.getDay();
    const searchStartTime = TimeFormatter.getTime();
    const searchEndTime = TimeFormatter.getTime(6);
    const scheduleURL = `https://api.winnipegtransit.com/v3/stops/${stopId}/schedule.json?usage=long&start=${year}-${month}-${day}T${searchStartTime}&end=${year}-${month}-${day}T${searchEndTime}&api-key=${baseApiData.apiKey}`;

    return scheduleURL;
  }

  getStopInformation = async streetStop => {
    const schedule = { busNumber: 'N/A', nextStop: 'N/A' };
    const stopScheduleURL = this.getStopScheduleURL(streetStop.id);
    const stops = await this.getData(stopScheduleURL);
    const stopSchedule = stops['stop-schedule']['route-schedules'][0];

    if (stopSchedule !== undefined) {
      const arrivalTime = stopSchedule['scheduled-stops'][0].times.arrival;

      schedule.busNumber = stopSchedule.route.key;

      if (arrivalTime !== undefined) {
        const nextStop = new Date(arrivalTime.estimated);

        schedule.nextStop = moment(nextStop).format('LT');
        schedule.stopTimeInMilliseconds = nextStop.getTime();
      }
    }

    return schedule;
  }

  getStopSchedules = async filteredStops => {
    const stopsWithSchedule = filteredStops;

    for (let i = 0; i < stopsWithSchedule.length; i++) {
      stopsWithSchedule[i].schedule = await this.getStopInformation(stopsWithSchedule[i]);
    }

    return stopsWithSchedule;
  }

  getStops = async streetId => {
    let filteredStops = [];
    transitSchedule.startOfQuery = TimeFormatter.getCurrentTime();

    const streetStops = await this.getData(`${baseApiData.baseStopURL.get()}${streetId}`);

    streetStops.stops.forEach(stop => {
      filteredStops.push({ id: stop.key, name: stop.name, crossStreet: stop['cross-street'].name, direction: stop.direction })
    })

    filteredStops = await this.getStopSchedules(filteredStops);

    filteredStops.sort((a, b) => {
      return a.schedule.stopTimeInMilliseconds - b.schedule.stopTimeInMilliseconds;
    })

    return filteredStops;
  }

  getSearchResults = async searchString => {
    const filteredResults = [];
    const searchURL = `${baseApiData.baseSearchURL.get()}${searchString}`;
    const searchResults = await transitSchedule.getData(searchURL)
      .catch(() => {
        renderer.renderPage();
        throw new Error('The search input was invalid');
      })

    searchResults.streets.forEach(result => {
      filteredResults.push({ id: result.key, streetName: result.name });
    })

    this.searchResults = filteredResults;

    return searchResults;
  }
}

const transitSchedule = new TransitSchedule();