let tags = ['friend', 'foe'];

let app = {
  getContacts() {
    fetch('/api/contacts')
      .then(response => response.json())
      .then(contacts => {
        this.parseTags(contacts);
        this.contacts = contacts;
        this.renderContacts(contacts);
      });
  },

  parseTags(contacts) {
    contacts.forEach(contact => {
      let tagsArray;
      if (contact.tags) {
        tagsArray = contact.tags.split(',').map(tag => tag.trim())
      } else {
        tagsArray = [];
      }
      contact.tags = tagsArray;
    });
  },

  renderContacts(contacts) {
    if (contacts.length > 0) {
      this.contactsDisplay.querySelector('div').innerHTML = this.contactsTemplate({contacts});
      this.show($(this.contactsDisplay));
    } else {
      this.contactsDisplay.querySelector('div').innerHTML = "<h1>There are no contacts to display.<h1>";
    }
  },

  editContact(event) {
    if (event.target.id === 'edit') {
      let contact = event.target.closest('.contact_container');
      this.getContactValues(contact);
      event.preventDefault();
      this.currentId = contact.dataset.id;
      this.displayContactForm(event, this.currentId);
    }
  },

  getContactValues(contact) {
    this.fullName = contact.querySelector('.full_name').textContent;
    this.phone = contact.querySelector('.phone_number').textContent;
    this.email = contact.querySelector('.email').textContent;
    this.contactTags = [...contact.querySelectorAll('.contact_tag')].map(anchor => anchor.textContent);
  },

  renderForEditing(heading) {
    let fullName = this.contactFormDisplay.querySelector("#full_name");
    let email = this.contactFormDisplay.querySelector("#email");
    let phone = this.contactFormDisplay.querySelector("#phone");
    let checkboxes = this.contactFormDisplay.querySelectorAll("[type='checkbox']");
    fullName.value = this.fullName;
    email.value = this.email;
    phone.value = this.phone;

    checkboxes.forEach(checkbox => {
      if (this.contactTags.includes(checkbox.value)) {
        checkbox.checked = true;
      }
    });

    heading.textContent = 'Edit Contact';
  },

  /*
  get the tags from the contact
  iterate through the tag checkboxes on the form
  if form checkbox tag is in contact tag array
    - check that checkbox
  */

  show($display) {
    $(this.contactsDisplay).hide();
    $(this.contactFormDisplay).hide();

    $display.show();
  },

  encodeData(form) {
    let formData = new FormData(form);
    let tags = [];
    let data = [];

    for ([key, value] of formData) {
      if (key.includes('tag')) {
        if (key !== 'add_tag') {
          tags.push(value);
        }
      } else {
        data.push([key, value]);
      }
    }

    tagString = tags.join(', ');
    data.push(['tags', tagString])

    return new URLSearchParams(data);
  },

  addContact(data) {
    fetch('api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: data,
    })
    // .then(response => response.json())
    .then(this.getContacts())
    .then(this.contactForm.reset());
  },

  updateContact(data) {
    data.append('id', this.currentId)
    fetch(`api/contacts/${this.currentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: data,
    })
    // .then(response => response.json())
    .then(this.getContacts())
    .then(this.contactForm.reset());
  },

  sendFormData(form, heading) {
    let data = this.encodeData(form);
    if (heading === 'Add Contact') {
      this.addContact(data);
    } else if (heading === 'Edit Contact') {
      this.updateContact(data);
    }
  },

  submitForm(event) {
    let form = event.target;
    let heading = this.contactFormDisplay.querySelector('h2').textContent;
    event.preventDefault();
    form.querySelectorAll('.error_message').forEach(errorMessage => {
      errorMessage.textContent = '';
    });
    if (!form.checkValidity()) {
      this.renderErrorMessages(form);
    } else {
      // this.removeErrorMessages(form);
      this.sendFormData(form, heading);
    }
  },

  renderErrorMessages(form) {
    form.querySelectorAll('input').forEach(input => {
      if (input.validity.valueMissing 
      || input.validity.patternMismatch
      || input.validity.typeMismatch ) {
        let errorMessage = input.nextElementSibling;
        let label = input.parentNode.firstElementChild.textContent.toLowerCase();
        errorMessage.textContent = `Please enter a valid ${label}.`;
        input.classList.add('error');
      }
    });
  },

  displayContactForm(event, editId) {
    this.contactForm.querySelectorAll('input').forEach(input => {
      input.classList.remove('error');
    });
    this.clearFilter() 
    let heading = this.contactFormDisplay.querySelector('h2');
    this.renderTags();
    if (editId) {
      this.renderForEditing(heading);
    } else {
      heading.textContent = 'Add Contact';
    }
    this.show($(this.contactFormDisplay));
  },

  /*
  When we display the form, we want the fields to be black

  */
  cancelAddContact(event) {
    this.contactForm.reset();
    this.show($(this.contactsDisplay));
  },

  addTag(event) {
    event.preventDefault();
    let newTag = (event.target.previousElementSibling.value);
    this.renderTags(newTag);
  },

  renderTags(newTag) {
    this.tags = [];
    let tags;
    let allTags = this.contacts.flatMap(contact => contact.tags);

    if (newTag) {
      this.tags.push(newTag);
    }

    allTags.forEach(tag => {
      if (!this.tags.includes(tag)) {
        this.tags.push(tag);
      }
    });

    tags = this.tags;
    this.contactForm.querySelector('fieldset > div').innerHTML = this.tagsTemplate({tags});
  },

  renderFilteredContacts(event) {
    let tagWord = event.target.textContent;
    let allTags = [...document.querySelectorAll('.contact_tag')];

    this.renderContacts(this.filterContacts(tagWord));
    this.filterMessage = document.querySelector('#filter_message');
    this.filterMessage.firstElementChild.textContent = `Contacts with '${tagWord}' tag:`;
    $(this.filterMessage).show();
    allTags = [...document.querySelectorAll('.contact_tag')];
    allTags.forEach(tag => {
      if (tag.textContent === tagWord) {
        tag.classList.add('filtered');
      }
    });
  },

  filterContacts(tagWord) {
    return this.contacts.filter(contact => {
      return contact.tags.includes(tagWord);
    });
  },

  filterByTag(event) {
    if (event.target.classList.contains('contact_tag')) {
      event.preventDefault();
      if (this.filtered === true) {
        return;
      } else {
        this.renderFilteredContacts(event)
        this.filtered = true;
      }
    }
  },

  clearFilter() {
    $(this.filterMessage).hide();
    this.filtered = false;
    this.renderContacts(this.contacts);
  },

  deleteContact(event) {
    if (event.target.id === 'delete') {
      event.preventDefault();
      this.clearFilter() 
      let contact = event.target.closest('.contact_container');
      let contactName = contact.querySelector('h2').textContent;
      let id = contact.dataset.id;
      if (window.confirm(`Do you really want to delete the contact ${contactName}?`)) {
        fetch(`api/contacts/${id}`, {method: 'DELETE'})
        .then(response => response.text())
        .then(this.getContacts());
      }
    }
  },

  searchFilter(event) {
    let searchTerm = event.target.value;
    let pattern = new RegExp(searchTerm, 'i');
    let filteredContacts = this.contacts.filter(contact => {
      return pattern.test(contact.full_name);
    });

    this.clearFilter();
    this.renderContacts(filteredContacts);
  },

  getElements() {
    this.contactsDisplay = document.querySelector('#contacts_display');
    this.addContactButton = document.querySelector('.add_contact_button');
    this.contactFormDisplay = document.querySelector('#contact_form_display');

    this.contactForm = document.querySelector('form');
    
    this.addTagButton = document.querySelector('#add_tag_button');
    this.cancelButton = document.querySelector('#cancel_button');
    this.searchBar = document.querySelector('#search');
    this.filterMessage = document.querySelector('#filter_message');
    this.clearFilterButton = document.querySelector('#clear_filter_button');
  },

  bindFunctions() {
    this.addContactButton.addEventListener('click', this.displayContactForm.bind(this));
    this.contactForm.addEventListener('submit', this.submitForm.bind(this));
    this.addTagButton.addEventListener('click', this.addTag.bind(this));
    document.body.addEventListener('click', this.filterByTag.bind(this));
    this.cancelButton.addEventListener('click', this.cancelAddContact.bind(this));
    document.body.addEventListener('click', this.deleteContact.bind(this));
    document.body.addEventListener('click', this.editContact.bind(this));
    this.searchBar.addEventListener('keyup', this.searchFilter.bind(this));
    this.clearFilterButton.addEventListener('click', this.clearFilter.bind(this));
  },

  compileTemplates() {
    this.contactsTemplate = Handlebars.compile(document.querySelector('#contacts_template').innerHTML);
    this.tagsTemplate = Handlebars.compile(document.querySelector('#tags_template').innerHTML);
    // this.contactTagsTemplate = Handlebars.compile(document.querySelector('#contact_tags_template').innerHTML);
    // Handlebars.registerPartial('contactTagsTemplate', document.querySelector('#contact_tags_template').innerHTML);
  },

  init() {
    this.getElements();
    this.bindFunctions();
    this.compileTemplates();
    this.getContacts();
  },
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
/*

to do:

  - break down into smaller objects
    - contacts
    - tags
    - API
    - app

to do:
  - 

improvements:
  - handle response errors?
  - tag filtering
  - dont clear tags after creation tags generated from all existing tags



*/

/*
header with 'contact manager' title

body has two parts: 
  - field with add contanct button and search bar
  - field that displays contacts
    if there are no contacts
      - says there are no contacts with add contact button
    if there are contacts
      - contacts displayed

main
  - render contacts

add contact button
  - brings up add contact form

filter by tag
  - filter contacts
  - rerender filtered contacts

search input
  - filters contacts and rerenders them

each contact has:
  - full name
  - phone number
  - email
  - edit button
    - hides contact display and shows edit contact display
  - delete button
    - alerts "Do you want to delete the contact?"
      - if okay, contact is removed and contact display is rerendered

edit contact display
  - edit contact heading
  - form for
    - full name
    - email address
    - telephone number
    - submit button
      - same as create contact
    - cancel button
      - same as create contact

delete contact


create contact
  - search bar field disappears
  - add contact field disappears
  - becomes the only thing in main part of body
    - create contact heading
    - fields for
      - full name
        - required
        - not validated
      - emaill address
        - required
        - must be valid email
      - telephone number
        - required
        - not validated
      - tags
        - checkbox of tags to include
        - option to create tags
      - submit button
        - checks validity of all fields
        - submits form if valid
        - resets form
        - hides create contact and shows rerendered contacts
      - cancel button
        - resets form
        - hides create contatct and shows rerendered contacts



*/